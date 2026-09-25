/// <reference types="vite/client" />

// 不要再声明 `declare module '*.vue'`。
// vue-tsc（Volar）能原生解析 .vue 并推导 props/emits 类型，该 shim 是多余的；
// 而真正让「prop 名写错」逃过检查的是 tsconfig 里缺 strictTemplates（见 tsconfig.json
// 的 vueCompilerOptions），Volar 默认允许未知属性（因为 fallthrough attrs 合法）。
