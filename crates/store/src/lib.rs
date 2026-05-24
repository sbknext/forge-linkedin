use anyhow::{Context, Result};
use chrono::{Local, NaiveDate, NaiveDateTime};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LikedPost {
    pub post_id: String,
    pub author: String,
    pub hashtag: String,
    pub post_url: String,
    pub liked_at: NaiveDateTime,
}

pub struct Store {
    conn: Connection,
}

impl Store {
    pub fn open(db_path: &Path) -> Result<Self> {
        let conn = Connection::open(db_path)
            .with_context(|| format!("opening db at {}", db_path.display()))?;
        let store = Self { conn };
        store.migrate()?;
        Ok(store)
    }

    fn migrate(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS liked_posts (
                post_id   TEXT PRIMARY KEY,
                author    TEXT NOT NULL,
                hashtag   TEXT NOT NULL,
                post_url  TEXT NOT NULL,
                liked_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS daily_count (
                date  TEXT PRIMARY KEY,
                count INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS skipped_posts (
                post_id    TEXT PRIMARY KEY,
                reason     TEXT NOT NULL,
                skipped_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                logged_in  INTEGER NOT NULL DEFAULT 0,
                last_login TEXT
            );
            ",
        )?;
        info!("db migrations applied");
        Ok(())
    }

    pub fn already_liked(&self, post_id: &str) -> Result<bool> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM liked_posts WHERE post_id = ?1",
            params![post_id],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    pub fn record_like(&mut self, post: &LikedPost) -> Result<()> {
        let liked_at = post.liked_at.format("%Y-%m-%dT%H:%M:%S").to_string();
        self.conn.execute(
            "INSERT OR IGNORE INTO liked_posts (post_id, author, hashtag, post_url, liked_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![post.post_id, post.author, post.hashtag, post.post_url, liked_at],
        )?;
        let today = Local::now().format("%Y-%m-%d").to_string();
        self.conn.execute(
            "INSERT INTO daily_count (date, count) VALUES (?1, 1)
             ON CONFLICT(date) DO UPDATE SET count = count + 1",
            params![today],
        )?;
        Ok(())
    }

    pub fn today_count(&self) -> Result<i64> {
        let today = Local::now().format("%Y-%m-%d").to_string();
        let count: i64 = self.conn.query_row(
            "SELECT COALESCE(count, 0) FROM daily_count WHERE date = ?1",
            params![today],
            |row| row.get(0),
        ).unwrap_or(0);
        Ok(count)
    }

    pub fn count_for_date(&self, date: NaiveDate) -> Result<i64> {
        let date_str = date.format("%Y-%m-%d").to_string();
        let count: i64 = self.conn.query_row(
            "SELECT COALESCE(count, 0) FROM daily_count WHERE date = ?1",
            params![date_str],
            |row| row.get(0),
        ).unwrap_or(0);
        Ok(count)
    }

    pub fn recent_likes(&self, limit: usize) -> Result<Vec<LikedPost>> {
        let mut stmt = self.conn.prepare(
            "SELECT post_id, author, hashtag, post_url, liked_at
             FROM liked_posts ORDER BY liked_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit as i64], |row| {
            let liked_at_str: String = row.get(4)?;
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                liked_at_str,
            ))
        })?;

        let mut posts = Vec::new();
        for row in rows {
            let (post_id, author, hashtag, post_url, liked_at_str) = row?;
            let liked_at = NaiveDateTime::parse_from_str(&liked_at_str, "%Y-%m-%dT%H:%M:%S")
                .unwrap_or_else(|_| Local::now().naive_local());
            posts.push(LikedPost { post_id, author, hashtag, post_url, liked_at });
        }
        Ok(posts)
    }

    pub fn record_skip(&self, post_id: &str, reason: &str) -> Result<()> {
        let now = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
        self.conn.execute(
            "INSERT OR IGNORE INTO skipped_posts (post_id, reason, skipped_at) VALUES (?1, ?2, ?3)",
            params![post_id, reason, now],
        )?;
        Ok(())
    }

    pub fn today_skip_count(&self) -> Result<i64> {
        let today = Local::now().format("%Y-%m-%d").to_string();
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM skipped_posts WHERE skipped_at LIKE ?1",
            params![format!("{}%", today)],
            |row| row.get(0),
        ).unwrap_or(0);
        Ok(count)
    }

    pub fn set_last_login(&self, timestamp: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO sessions (id, logged_in, last_login) VALUES (1, 1, ?1)",
            params![timestamp],
        )?;
        Ok(())
    }

    pub fn last_login(&self) -> Result<Option<String>> {
        let result = self.conn.query_row(
            "SELECT last_login FROM sessions WHERE id = 1",
            [],
            |row| row.get::<_, Option<String>>(0),
        );
        match result {
            Ok(v) => Ok(v),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn make_store() -> (Store, tempfile::TempDir) {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let store = Store::open(&db_path).unwrap();
        (store, dir)
    }

    #[test]
    fn test_migrations_run() {
        let (_store, _dir) = make_store();
    }

    #[test]
    fn test_record_and_dedup_like() {
        let (mut store, _dir) = make_store();
        let post = LikedPost {
            post_id: "post123".into(),
            author: "Alice".into(),
            hashtag: "#AgenticAI".into(),
            post_url: "https://linkedin.com/posts/post123".into(),
            liked_at: Local::now().naive_local(),
        };
        store.record_like(&post).unwrap();
        assert!(store.already_liked("post123").unwrap());
        assert!(!store.already_liked("post999").unwrap());
    }

    #[test]
    fn test_today_count() {
        let (mut store, _dir) = make_store();
        assert_eq!(store.today_count().unwrap(), 0);
        let post = LikedPost {
            post_id: "abc".into(),
            author: "Bob".into(),
            hashtag: "#LLM".into(),
            post_url: "https://linkedin.com/posts/abc".into(),
            liked_at: Local::now().naive_local(),
        };
        store.record_like(&post).unwrap();
        assert_eq!(store.today_count().unwrap(), 1);
    }

    #[test]
    fn test_recent_likes() {
        let (mut store, _dir) = make_store();
        for i in 0..3u32 {
            let post = LikedPost {
                post_id: format!("post{}", i),
                author: "Carol".into(),
                hashtag: "#AITooling".into(),
                post_url: format!("https://linkedin.com/posts/post{}", i),
                liked_at: Local::now().naive_local(),
            };
            store.record_like(&post).unwrap();
        }
        let recent = store.recent_likes(2).unwrap();
        assert_eq!(recent.len(), 2);
    }

    #[test]
    fn test_skip_count() {
        let (store, _dir) = make_store();
        store.record_skip("skip1", "keyword").unwrap();
        store.record_skip("skip2", "low_engagement").unwrap();
        // dedup: same post_id again
        store.record_skip("skip1", "keyword").unwrap();
        let count = store.today_skip_count().unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn test_last_login() {
        let (store, _dir) = make_store();
        assert!(store.last_login().unwrap().is_none());
        store.set_last_login("2026-05-24T10:00:00").unwrap();
        assert_eq!(store.last_login().unwrap(), Some("2026-05-24T10:00:00".into()));
    }
}
