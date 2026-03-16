import { blackA, green, mauve, slate, violet } from "@radix-ui/colors";
import plugin from "tailwindcss/plugin";
import containerQueries from "@tailwindcss/container-queries";
import typography from "@tailwindcss/typography";
import forms from "@tailwindcss/forms";
import tailwindcssAnimate from "tailwindcss-animate";
import headlessui from "@headlessui/tailwindcss";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", "data-[theme='dark']"],
  theme: {
    extend: {
      fontSize: {
        '2xs': [
          "0.625rem", // 10px
          {
            lineHeight: "0.875rem", // 14px
          },
        ],
        xxs: [
          "0.75rem", // 12px
          {
            lineHeight: "1.125rem", // 18px
          },
        ],
        xs: [
          "0.8125rem", // 13px
          {
            lineHeight: "1.125rem", // 18px
          },
        ],
        sm: [
          "0.875rem", // 14px
          {
            lineHeight: "1.25rem", // 20px
          },
        ],
        base: [
          "1rem", // 16px
          {
            lineHeight: "1.5rem", // 24px
          },
        ],
        lg: [
          "1.125rem", // 18px
          {
            lineHeight: "1.75rem", // 28px
            letterSpacing: "-0.01em", // tracking-tight
          },
        ],
        xl: [
          "1.25rem", // 20px
          {
            lineHeight: "1.875rem", // 30px
            letterSpacing: "-0.01em", // tracking-tight
          },
        ],
      },
      fontFamily: {
        mono: [
          `"Fira Code"`,
          `ui-monospace`,
          `SFMono-Regular`,
          `Menlo`,
          `Monaco`,
          `Consolas`,
          `"Liberation Mono"`,
          `"Courier New"`,
          `monospace`,
        ],
      },
      letterSpacing: {
        tighter: "-0.04em",
        tight: "-0.03em",
        snug: "-0.02em",
        normal: "0",
        wide: "0.03em",
      },
      lineHeight: {
        tight: "1.20",
      },
      backgroundImage: {
        navMenu: "linear-gradient(132deg, #4499F7 0%, #3FCDD6 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "3px",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      zIndex: {
        base: "0",
        dropdown: "100",
        sticky: "200",
        sidebar: "250",
        overlay: "300",
        modal: "400",
        popover: "500",
        tooltip: "600",
        toast: "700",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      },
      backgroundColor: {
        primary: "var(--color-background)",
        "primary-hover": "var(--color-surface)",
        secondary: "var(--color-surface)",
        "secondary-hover": "var(--color-border-light)",
        tertiary: "var(--color-border-light)",
        quaternary: "var(--color-border)",

        "brand-primary": "var(--color-primary)",
        "brand-primary-hover": "var(--color-secondary)",
        "brand-secondary": "var(--color-surface)",
        "brand-tertiary": "var(--color-border-light)",
        purple: "var(--color-primary)",

        "success-primary": "var(--color-success)",
        "success-secondary": "var(--color-surface)",
        "success-strong": "var(--color-success)",
        "error-primary": "var(--color-error)",
        "error-secondary": "var(--color-surface)",
        "error-strong": "var(--color-error)",
        "error-strong-hover": "var(--color-error)",
        "warning-primary": "var(--color-warning)",
        "warning-secondary": "var(--color-surface)",
        "warning-strong": "var(--color-warning)",

        "user-message": "var(--color-user-message-bg)",
        "file-button": "var(--color-file-button)",
        "file-button-hover": "var(--color-file-button-hover)",
        "avatar": "var(--color-avatar-bg)",
        "subagent-hover": "var(--color-subagent-hover)",
      },
      borderColor: {
        primary: "var(--color-border)",
        secondary: "var(--color-border-light)",
        tertiary: "var(--color-border-light)",
        error: "var(--color-error)",
        "error-strong": "var(--color-error)",
        brand: "var(--color-primary)",
        "brand-strong": "var(--color-primary)",
        "brand-subtle": "var(--color-border)",
        strong: "var(--color-border)",
        warning: "var(--color-warning)",
        success: "var(--color-success)",
        purple: "var(--color-primary)",
        "status-green": "var(--color-success)",
        "status-orange": "var(--color-warning)",
        "status-yellow": "var(--color-warning)",
        "status-red": "var(--color-error)",
      },
      textColor: {
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        tertiary: "var(--color-text-tertiary)",
        quaternary: "var(--color-text-tertiary)",
        disabled: "var(--color-text-tertiary)",
        error: "var(--color-error)",
        warning: "var(--color-warning)",
        success: "var(--color-success)",
        placeholder: "var(--color-text-tertiary)",
        purple: "var(--color-primary)",
        "brand-primary": "var(--color-primary)",
        "brand-secondary": "var(--color-secondary)",
        "brand-tertiary": "var(--color-text-secondary)",
        "brand-disabled": "var(--color-text-tertiary)",
        "status-green": "var(--color-success)",
        "status-orange": "var(--color-warning)",
        "status-yellow": "var(--color-warning)",
        "status-red": "var(--color-error)",
        "button-primary": "var(--color-text-primary)",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        brand: {
          green: {
            25: "var(--brand-25)",
            50: "var(--brand-50)",
            100: "var(--brand-100)",
            200: "var(--brand-200)",
            300: "var(--brand-300)",
            400: "var(--brand-400)",
            500: "var(--brand-500)",
            600: "var(--brand-600)",
            700: "var(--brand-700)",
            800: "var(--brand-800)",
            900: "var(--brand-900)",
            950: "var(--brand-950)",
          },
        },
      },
      keyframes: {
        hide: {
          from: { opacity: 1 },
          to: { opacity: 0 },
        },
        slideIn: {
          from: {
            transform: "translateX(calc(100% + var(--viewport-padding)))",
          },
          to: { transform: "translateX(0)" },
        },
        swipeOut: {
          from: { transform: "translateX(var(--radix-toast-swipe-end-x))" },
          to: { transform: "translateX(calc(100% + var(--viewport-padding)))" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        hide: "hide 100ms ease-in",
        slideIn: "slideIn 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        swipeOut: "swipeOut 100ms ease-out",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
    },
    typography: {
      playground: {
        css: {
          "h1, h2, h3, h4, h5, h6": {
            fontWeight: "bold",
          },
          h1: {
            fontSize: "24px",
          },
          h2: {
            fontSize: "20px",
          },
          h3: {
            fontSize: "18px",
          },
          h4: {
            fontSize: "16px",
          },
          h5: {
            fontSize: "14px",
          },
          h6: {
            fontSize: "12px",
          },
          ul: {
            marginLeft: "20px !important",
            listStyleType: "disc !important",
          },
          ol: {
            marginLeft: "20px !important",
            listStyleType: "decimal !important",
          },
          a: {
            color: "#287977",
            textDecoration: "underline",
            "&:hover": {
              textDecoration: "underline",
            },
          },
          table: {
            width: "100%",
            borderCollapse: "collapse",
            th: {
              padding: "0.5rem",
              border: "1px solid var(--gray-100)",
              fontWeight: "bold",
              textAlign: "left",
            },
            td: {
              padding: "0.5rem",
              border: "1px solid var(--gray-100)",
            },
          },
          blockquote: {
            borderLeft: "2px solid var(--gray-100)",
            paddingLeft: "1rem",
            marginLeft: "0",
            fontStyle: "italic",
          },

          "s, strike, del": {
            textDecoration: "line-through",
          },
        },
      },
    },
  },
  plugins: [
    containerQueries,
    typography,
    forms,
    tailwindcssAnimate,
    headlessui,
    plugin(({ addUtilities, addBase }) => {
      addBase({
        input: {
          borderWidth: "0",
          padding: "0",
        },
        // Global scrollbar styles for all scrollable elements
        "html, body, *": {
          "scrollbar-width": "thin",
          "scrollbar-color": "rgba(156, 163, 175, 0.3) transparent",
        },
        "html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar":
          {
            width: "8px",
            background: "transparent",
          },
        "html::-webkit-scrollbar-track, body::-webkit-scrollbar-track, *::-webkit-scrollbar-track":
          {
            background: "transparent",
          },
        "html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-track, *::-webkit-scrollbar-thumb":
          {
            "background-color": "rgba(156, 163, 175, 0.3)",
            "border-radius": "20px",
            border: "2px solid transparent",
            "background-clip": "content-box",
          },
        "html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover, *::-webkit-scrollbar-thumb:hover":
          {
            "background-color": "rgba(156, 163, 175, 0.5)",
          },
      });
      addUtilities({
        ".no-scrollbar": {
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      });

      // https://github.com/tailwindlabs/tailwindcss/discussions/12127
      addUtilities({
        ".break-anywhere": {
          "@supports (overflow-wrap: anywhere)": {
            "overflow-wrap": "anywhere",
          },
          "@supports not (overflow-wrap: anywhere)": {
            "word-break": "break-word",
          },
        },
      });

      addUtilities({
        ".no-number-spinner": {
          MozAppearance: "textfield",
          "&::-webkit-outer-spin-button": {
            WebkitAppearance: "none !important",
            margin: 0,
          },
          "&::-webkit-inner-spin-button": {
            WebkitAppearance: "none !important",
            margin: 0,
          },
        },
      });

      addUtilities({
        ".text-security": {
          textSecurity: "disc",
          WebkitTextSecurity: "disc",
          MozTextSecurity: "disc",
        },
      });

      addUtilities({
        ".display-sm": {
          fontSize: "1rem", // 16px
          lineHeight: "1.5rem", // 24px
          fontWeight: "600", // semibold
        },
        ".display-base": {
          fontSize: "1.5rem", // 24px
          lineHeight: "2rem", // 32px
          letterSpacing: "-0.01em", // tracking-tight
        },
        ".display-lg": {
          fontSize: "1.875rem", // 30px
          lineHeight: "2.375rem", // 38px
          letterSpacing: "-0.01em", // tracking-tight
        },
        ".display-xl": {
          fontSize: "2.25rem", // 36px
          lineHeight: "2.75rem", // 44px
          letterSpacing: "-0.01em", // tracking-tight
        },
        ".display-2xl": {
          fontSize: "3rem", // 48px
          lineHeight: "3.75rem", // 60px
          letterSpacing: "-0.01em", // tracking-tight
        },
        ".caps-label-sm": {
          fontSize: "0.875rem", // 14px
          lineHeight: "1.25rem", // 20px
          letterSpacing: "0.02625rem", // 0.42px
          textTransform: "uppercase",
        },
        ".caps-label-xs": {
          fontSize: "0.75rem", // 14px
          lineHeight: "1.125rem", // 20px
          letterSpacing: "0.0225rem", // 0.42px
          textTransform: "uppercase",
        },
      });
    }),
  ],
};
