/**
 * ESLint 9 flat config（h5 工作区）
 * - typescript-eslint recommended：TS 正确性规则（含关闭 no-undef 等 JS 规则）
 * - eslint-plugin-vue flat/essential：Vue3 关键规则（首期用 essential，避免大面积格式噪音）
 */
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser }
    }
  },
  {
    rules: {
      // 项目沿用 kebab-case 文件名 + index.vue 页面入口的约定，放开多词组件名限制
      'vue/multi-word-component-names': 'off'
    }
  }
);
