import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/**/__tests__/**/*.{ts,tsx}", "src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-constant-binary-expression": "off",
    },
  },
  // Educación: Radix portals `*Content` to document.body, outside the
  // `.education-shell` scope that carries the green sub-brand tokens
  // (spec education-theming — "Radix portals stay inside the education
  // scope"). Force every education file through the education/ui/*
  // wrappers, which pre-apply the scope className, instead of the raw
  // shadcn primitives.
  {
    files: ["src/pages/dashboard/education/**/*.{ts,tsx}"],
    // PR-H (tasks-v2 H.5): the PR1-3c transitional exemption
    // (CurriculumList/CurriculumEditor/LessonList/AssignmentList) is gone —
    // those files are deleted (AssignmentList moved to admin/AssignmentList.tsx
    // and migrated to the education/ui/* wrappers instead of staying
    // exempted). Only the wrapper directory itself stays exempt (it's what
    // imports the raw shadcn primitives in the first place).
    ignores: ["src/pages/dashboard/education/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/components/ui/dialog",
              message: "Radix portalea fuera de .education-shell. Usá EducationDialog de education/ui.",
            },
            {
              name: "@/components/ui/confirm-dialog",
              message: "Usá EducationConfirmDialog de education/ui.",
            },
            {
              name: "@/components/ui/select",
              message: "Usá EducationSelect de education/ui.",
            },
            {
              name: "@/components/ui/popover",
              message: "Usá EducationPopover de education/ui.",
            },
            {
              name: "@/components/ui/dropdown-menu",
              message: "Usá EducationDropdownMenu de education/ui.",
            },
            {
              name: "@/components/ui/sheet",
              message: "Usá EducationSheet de education/ui.",
            },
            {
              name: "@/components/ui/tooltip",
              message: "Usá EducationTooltip de education/ui.",
            },
          ],
        },
      ],
    },
  },
);
