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

        'toggle',
        'toggle-sm',
        'toggle-md',
        'toggle-lg',
    ],
    plugins: [
        require("daisyui")
    ],
    daisyui: {
        themes: ["light", "dark"],
        base: true,
        styled: true,
        utils: true,
    },
};