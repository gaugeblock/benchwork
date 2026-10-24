use std::collections::BTreeMap;
use tempfile::tempdir;
use benchwork_core::{
    read_sawhorse_config, write_sawhorse_config, RoleOverrideConfig, UniversalModelConfig,
};

#[test]
fn test_default_config_reading() {
    let dir = tempdir().expect("tempdir");
    let cfg = read_sawhorse_config(dir.path()).expect("read default");
    assert!(cfg.use_universal_fallback);
    assert_eq!(cfg.mode, "openai_compatible");
}

#[test]
fn test_config_write_and_read_roundtrip() {
    let dir = tempdir().expect("tempdir");
    let mut overrides = BTreeMap::new();
    overrides.insert(
        "planner".to_string(),
        RoleOverrideConfig {
            enabled: true,
            provider: "Local".to_string(),
            model_name: "llama-3-8b".to_string(),
            base_url: Some("http://127.0.0.1:8080".to_string()),
            api_key_env: None,
            mode: "local_runtime".to_string(),
        },
    );

    let config = UniversalModelConfig {
        use_universal_fallback: true,
        provider: "Anthropic".to_string(),
        model_name: "claude-3-5-sonnet".to_string(),
        base_url: Some("https://api.anthropic.com/v1".to_string()),
        api_key_env: Some("ANTHROPIC_API_KEY".to_string()),
        mode: "openai_compatible".to_string(),
        role_overrides: overrides,
    };

    write_sawhorse_config(dir.path(), &config).expect("write config");
    assert!(dir.path().join("sawhorse.toml").is_file());

    let reloaded = read_sawhorse_config(dir.path()).expect("read reloaded");
    assert_eq!(reloaded.mode, "openai_compatible");
}
