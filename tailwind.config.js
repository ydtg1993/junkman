module.exports = {
    content: [
        "./src/**/*.{ts,js,html}",
        "./dist/**/*.html"
    ],
    theme: {
        extend: {},
    },
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