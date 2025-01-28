declare module '*.css' {
  const styles: { [className: string]: string }
  export default styles
}

declare module 'postcss' {
  export interface AtRule {
    name: string;
    params: string;
  }
}

// Add support for CSS Modules
declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}

// Add support for Tailwind directives
interface TailwindDirective {
  (path: string): void
}

declare module 'tailwindcss' {
  const tailwind: TailwindDirective
  export default tailwind
}

declare module 'autoprefixer' {
  const autoprefixer: any;
  export default autoprefixer;
} 