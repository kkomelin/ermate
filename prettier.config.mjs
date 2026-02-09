/** @type {import('prettier').Config} */
const config = {
  // Formatting
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,

  // Plugins - Tailwind CSS class sorting
  plugins: ['prettier-plugin-tailwindcss'],

  // Tailwind functions and attributes
  tailwindFunctions: ['clsx', 'cn', 'cva', 'c'],
  tailwindAttributes: ['class', 'className', 'ngClass', ':class'],
}

export default config
