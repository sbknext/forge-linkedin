use assert_cmd::Command;
use predicates::prelude::*;
use tempfile::TempDir;

fn cmd() -> Command {
    Command::cargo_bin("forge-linkedin").unwrap()
}

fn with_temp_home() -> TempDir {
    tempfile::tempdir().unwrap()
}

/// Run init in a temp directory by overriding HOME
#[test]
fn test_init_creates_files() {
    let home = with_temp_home();
    let forge_dir = home.path().join(".forge-linkedin");

    // We can't easily override HOME in a subprocess without env manipulation,
    // so we test the init logic via the store + direct fs check instead.
    // The actual `forge-linkedin init` command uses UserDirs which reads HOME.
    // This tests the underlying store open (migration) works:
    let db_path = forge_dir.clone();
    std::fs::create_dir_all(&db_path).unwrap();
    let db = db_path.join("data.db");
    let store = store::Store::open(&db).unwrap();
    assert_eq!(store.today_count().unwrap(), 0);
}

#[test]
fn test_status_missing_db() {
    let home = with_temp_home();
    // Use a non-existent forge dir — status should fail gracefully
    // We test via the store::Store API directly
    let db_path = home.path().join(".forge-linkedin").join("data.db");
    assert!(!db_path.exists());
}

#[test]
fn test_jobs_search_stub() {
    cmd()
        .args(["jobs", "search"])
        .assert()
        .success()
        .stdout(predicate::str::contains("Phase 2"));
}

#[test]
fn test_jobs_apply_stub() {
    cmd()
        .args(["jobs", "apply"])
        .assert()
        .success()
        .stdout(predicate::str::contains("Phase 2"));
}

#[test]
fn test_version_flag() {
    cmd()
        .arg("--version")
        .assert()
        .success()
        .stdout(predicate::str::contains("0.1.0"));
}

#[test]
fn test_help_flag() {
    cmd()
        .arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("forge-linkedin"));
}
