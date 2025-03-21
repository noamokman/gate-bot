import { baseConfig } from '@osskit/eslint-config';
import typescriptEslint from 'typescript-eslint';

export default typescriptEslint.config({ ignores: ['dist/**'] }, { ...baseConfig, files: ['src/**/*.ts'] });
