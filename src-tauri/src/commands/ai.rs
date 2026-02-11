use tauri::State;
use crate::state::AppState;
use crate::commands::config::read_config;

#[tauri::command]
pub async fn generate_commit_message(
    state: State<'_, AppState>,
    diff: String,
    stat: String,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let config = read_config(&root);
    let ai = &config.ai;

    if ai.api_key.is_empty() {
        return Err("No API Key configured".into());
    }

    let base = ai.base_url.trim_end_matches('/');
    let url = if base.ends_with("/v1") || base.contains("/api/") {
        format!("{}/chat/completions", base)
    } else {
        format!("{}/v1/chat/completions", base)
    };

    let max_diff_len = 8000;
    let truncated_diff = if diff.len() > max_diff_len {
        format!("{}...\n[diff truncated]", &diff[..max_diff_len])
    } else {
        diff.clone()
    };

    let default_prompt = "你是一个专业的 Git 提交信息生成器。请根据提供的 git diff 生成高质量的中文提交信息。\n\n规则：\n1. 使用 Conventional Commits 格式：<type>(<scope>): <中文描述>\n2. type 类型：feat、fix、refactor、docs、style、test、chore、perf、ci、build\n3. scope 为受影响的模块/组件（可选但推荐）\n4. 主题行：祈使语气，不加句号，最多 72 字符\n5. 如果变更较大，空一行后用要点说明关键变更\n6. 要点以 '- ' 开头，解释「为什么」而非仅描述「做了什么」\n7. 如果有多个不相关的变更，主题行聚焦最重要的那个\n8. 提交信息的描述部分必须使用中文\n\n只回复提交信息本身，不要有任何其他内容。";
    let system_prompt = if ai.custom_prompt.is_empty() {
        default_prompt.to_string()
    } else {
        format!("{}\n\n{}", default_prompt, ai.custom_prompt)
    };

    let body = serde_json::json!({
        "model": ai.model,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": format!("Git diff stat:\n{}\n\nDiff content:\n{}", stat, truncated_diff) }
        ],
        "max_tokens": 500,
        "temperature": 0.3,
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", ai.api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return Err(format!("AI API error: {}", err_text));
    }

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let message = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string();

    Ok(serde_json::json!({ "message": message }))
}
