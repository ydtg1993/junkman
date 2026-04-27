module.exports = {
    content: [
        "./src/**/*.{ts,js,html}",
        "./dist/**/*.html"
    ],
    safelist: [
        // 保留所有 alert 颜色变体
        'alert-info',
        'alert-success',
        'alert-warning',
        'alert-error',
        // 如果有需要，也可保留其他动态类
    ],
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
        require("daisyui")
    ],
    daisyui: {
        themes: ["light", "dark"],
        darkTheme: "dark",
        base: true,
        styled: true,
        utils: true,
    },
}