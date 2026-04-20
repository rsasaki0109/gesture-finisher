/** 右パネル用の簡易 SVG（外部画像なし） */

export const ILLU_KAMEHAMEHA = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" role="img" aria-label="かめはめ波：両手を前で合わせる例">
  <rect width="240" height="320" rx="14" fill="#0c1222" stroke="#334155" stroke-width="1.5"/>
  <text x="120" y="26" text-anchor="middle" fill="#7dd3fc" font-size="13" font-family="system-ui,sans-serif" font-weight="600">↑ カメラ（レンズ方向）</text>
  <path d="M120 34 L114 48 L126 48 Z" fill="#7dd3fc"/>
  <line x1="120" y1="48" x2="120" y2="62" stroke="#475569" stroke-width="2"/>
  <circle cx="120" cy="86" r="18" stroke="#e2e8f0" stroke-width="2" fill="#1e293b"/>
  <line x1="120" y1="104" x2="120" y2="188" stroke="#e2e8f0" stroke-width="2.5"/>
  <ellipse cx="95" cy="142" rx="20" ry="28" transform="rotate(-22 95 142)" stroke="#38bdf8" stroke-width="2" fill="rgba(56,189,248,0.12)"/>
  <ellipse cx="145" cy="142" rx="20" ry="28" transform="rotate(22 145 142)" stroke="#38bdf8" stroke-width="2" fill="rgba(56,189,248,0.12)"/>
  <ellipse cx="120" cy="132" rx="26" ry="16" stroke="#38bdf8" stroke-width="2.5" fill="rgba(56,189,248,0.28)"/>
  <path d="M120 118 L120 78" stroke="#fbbf24" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#mk-kh)"/>
  <defs><marker id="mk-kh" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24"/></marker></defs>
  <text x="120" y="212" text-anchor="middle" fill="#e2e8f0" font-size="13" font-family="system-ui,sans-serif">
    <tspan>① </tspan><tspan fill="#7dd3fc" font-weight="700">両手を前でくっつける</tspan>
  </text>
  <text x="120" y="236" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">② キープ → パネルが「発射OK」</text>
  <text x="120" y="258" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">
    <tspan>③ カメラへ </tspan><tspan fill="#6ee7b7" font-weight="700">グッと押し出す</tspan>
  </text>
</svg>`.trim();

export const ILLU_RASENGAN = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" role="img" aria-label="螺旋丸：片手のひらをカメラに向ける例">
  <rect width="240" height="320" rx="14" fill="#0c1222" stroke="#334155" stroke-width="1.5"/>
  <text x="120" y="26" text-anchor="middle" fill="#7dd3fc" font-size="13" font-family="system-ui,sans-serif" font-weight="600">↑ カメラ</text>
  <path d="M120 34 L114 48 L126 48 Z" fill="#7dd3fc"/>
  <line x1="120" y1="48" x2="120" y2="62" stroke="#475569" stroke-width="2"/>
  <circle cx="118" cy="92" r="16" stroke="#e2e8f0" stroke-width="2" fill="#1e293b"/>
  <line x1="118" y1="108" x2="95" y2="175" stroke="#e2e8f0" stroke-width="2.5"/>
  <line x1="118" y1="108" x2="168" y2="128" stroke="#e2e8f0" stroke-width="2.5"/>
  <ellipse cx="178" cy="118" rx="22" ry="20" stroke="#38bdf8" stroke-width="2" fill="rgba(56,189,248,0.15)"/>
  <circle cx="198" cy="108" r="36" stroke="#a78bfa" stroke-width="2.5" fill="rgba(167,139,250,0.12)"/>
  <path d="M198 78 A36 36 0 0 1 228 108" stroke="#c4b5fd" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M210 88 A24 24 0 0 1 222 108" stroke="#7dd3fc" stroke-width="1.5" fill="none"/>
  <text x="120" y="212" text-anchor="middle" fill="#e2e8f0" font-size="13" font-family="system-ui,sans-serif">
    <tspan>① </tspan><tspan fill="#7dd3fc" font-weight="700">片手のひらをカメラに</tspan>
  </text>
  <text x="120" y="236" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">② 少し止める → 「発射OK」</text>
  <text x="120" y="258" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">
    <tspan>③ ひらを </tspan><tspan fill="#6ee7b7" font-weight="700">前に突き出す</tspan>
  </text>
</svg>`.trim();
