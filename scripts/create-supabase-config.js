#!/usr/bin/env node
/**
 * Supabase 설정 파일을 빌드 시 자동으로 생성하는 스크립트입니다.
 *
 * 사용 방법:
 *   SUPABASE_URL=https://... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/create-supabase-config.js
 *
 * Vercel 등 배포 환경에서는 환경 변수에 동일한 이름으로 값을 등록한 뒤
 * Build Command에 `node scripts/create-supabase-config.js`를 추가하세요.
 */

const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_SCORES_TABLE = process.env.SUPABASE_SCORES_TABLE || "card_flip_scores";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[create-supabase-config] 환경 변수 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다.");
  process.exit(1);
}

const targetPath = path.join(__dirname, "..", "server", "supabase-config.php");
const phpConfig = `<?php
return [
    'url' => '${SUPABASE_URL.replace(/'/g, "\\'")}',
    'service_role_key' => '${SUPABASE_SERVICE_ROLE_KEY.replace(/'/g, "\\'")}',
    'scores_table' => '${SUPABASE_SCORES_TABLE.replace(/'/g, "\\'")}',
];
`;

fs.writeFileSync(targetPath, phpConfig, { encoding: "utf8", mode: 0o600 });
console.log(`[create-supabase-config] Supabase 설정을 ${targetPath} 에 생성했습니다.`);

