import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * Config plate ESLint 9 (Next 16).
 * On compose le parser TypeScript (typescript-eslint) avec le plugin officiel
 * @next/eslint-plugin-next plutôt que le preset `eslint-config-next` complet,
 * qui déclenche une erreur de validation circulaire avec ESLint 9.
 * Le lint ne bloque pas `next build` en Next 16 ; il sert d'outil ponctuel.
 */
export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "supabase/**",
      "backups/**",
      "public/**",
      "next.config.mjs",
      "postcss.config.js",
      "tailwind.config.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      // Code hérité (Lovable) : hooks conditionnels et deps incomplètes assumés.
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
);
