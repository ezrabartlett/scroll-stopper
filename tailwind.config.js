/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--color-brand)",
          hover: "var(--color-brand-hover)",
          deep: "var(--color-brand-deep)",
          soft: "var(--color-brand-soft)",
          border: "var(--color-brand-border)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          soft: "var(--color-success-soft)",
          subtle: "var(--color-success-subtle)",
          hover: "var(--color-success-hover)",
          border: "var(--color-success-border)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          hover: "var(--color-danger-hover)",
          strong: "var(--color-danger-strong)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          raised: "var(--color-surface-raised)",
          hover: "var(--color-surface-hover)",
        },
        txt: {
          DEFAULT: "var(--color-text)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        line: "var(--color-border)",
        input: "var(--color-input-border)",
        "toggle-off": "var(--color-toggle-off)",
        disabled: {
          DEFAULT: "var(--color-disabled-bg)",
          text: "var(--color-disabled-text)",
        },
        tooltip: {
          DEFAULT: "var(--color-tooltip-bg)",
          text: "var(--color-tooltip-text)",
        },
        "btn-neutral": {
          DEFAULT: "var(--color-btn-neutral)",
          fill: "var(--color-btn-neutral-fill)",
          text: "var(--color-btn-neutral-text)",
        },
        overlay: "var(--color-overlay)",
      },
    },
  },
  plugins: [],
};
