import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import query from '@tanstack/eslint-plugin-query'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'coverage', '.verification']),
  js.configs.recommended,
  { files: ['*.js', '*.cjs'], languageOptions: { globals: globals.node } },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      query.configs['flat/recommended'],
    ],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
])
