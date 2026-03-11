import type { Config } from "tailwindcss";

// Next.js の next dev hoshiyomi で実行されるとき、
// process.cwd() は親ディレクトリ(星読み/)を指す。
// tailwind が content を見つけられない場合はsafelist で補完する。
const config: Config = {
  content: [
    // 複数パターンで試みる（どれか1つが動けばOK）
    "./hoshiyomi/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hoshiyomi/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hoshiyomi/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // safelist: コンテンツスキャンが失敗した場合のフォールバック
  // すべてのユーティリティを強制生成
  safelist: [
    { pattern: /^(flex|grid|block|inline|hidden|contents)/ },
    { pattern: /^(flex-|grid-)/ },
    { pattern: /^(items-|justify-|self-|place-)/ },
    { pattern: /^(gap-|space-x-|space-y-)/ },
    { pattern: /^(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr)-/ },
    { pattern: /^(w-|h-|min-w-|min-h-|max-w-|max-h-)/ },
    { pattern: /^(text-|font-|leading-|tracking-)/ },
    { pattern: /^(rounded|border|ring|outline)/ },
    { pattern: /^(bg-|text-|border-|ring-|fill-|stroke-)/ },
    { pattern: /^(overflow|z-|opacity-|visibility)/ },
    { pattern: /^(fixed|absolute|relative|sticky|static)/ },
    { pattern: /^(inset-|top-|right-|bottom-|left-)/ },
    { pattern: /^(transition|duration-|ease-|animate-|transform)/ },
    { pattern: /^(scale-|rotate-|translate-|skew-)/ },
    { pattern: /^(hover:|focus:|active:|disabled:)/ },
    { pattern: /^(sm:|md:|lg:|xl:|2xl:)/ },
    { pattern: /^(cursor-|pointer-events-|select-)/ },
    { pattern: /^(resize|whitespace|break|truncate|line-clamp)/ },
    { pattern: /^(shadow|drop-shadow|blur|backdrop-blur)/ },
    { pattern: /^(col-|row-|order-)/ },
    { pattern: /^(shrink|grow)/ },
  ],
  theme: {
    extend: {
      colors: {
        void:         "#06030f",
        deep:         "#0a0612",
        gold:         "#c9a84c",
        "gold-light": "#e8c97a",
        "gold-pale":  "#f5e6b8",
        rose:         "#9b4f6b",
        "rose-light": "#d4789a",
        indigo:       "#2d1b69",
        violet:       "#6b3fa0",
      },
      fontFamily: {
        cormorant: ["Cormorant Garamond", "serif"],
        shippori:  ["Shippori Mincho", "serif"],
        noto:      ["Noto Serif JP", "serif"],
      },
      animation: {
        twinkle:   "twinkle 8s ease-in-out infinite alternate",
        float:     "float 4s ease-in-out infinite",
        blink:     "blink 2s ease-in-out infinite",
        fadeInUp:  "fadeInUp 0.4s ease forwards",
        dotBounce: "dotBounce 1.4s ease-in-out infinite",
      },
      keyframes: {
        twinkle:   { "0%": { opacity: "0.3", transform: "scale(0.8)" }, "100%": { opacity: "1", transform: "scale(1.2)" } },
        float:     { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-10px)" } },
        blink:     { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.3" } },
        fadeInUp:  { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        dotBounce: { "0%, 80%, 100%": { transform: "translateY(0)" }, "40%": { transform: "translateY(-6px)" } },
      },
    },
  },
  plugins: [],
};

export default config;
