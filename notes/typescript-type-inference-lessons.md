# TypeScript Type Inference Lessons

## The Problem
When using `createService` from the restate-for-dummies package through a re-export chain (via `@my/restate-primitives`), TypeScript was inferring handler types as `any` instead of preserving the actual handler signatures. This only affected services - objects and workflows worked correctly.

## Root Cause
The issue was that `TransformHandlers` type was **exported** in `typed-service.ts` but **not exported** in `typed-object.ts` and `typed-workflow.ts`.

### Why This Matters
When TypeScript generates declaration files (.d.ts):
- **Non-exported types**: Get inlined directly in the declaration
- **Exported types**: Get referenced as imports

### The Problem Chain
1. `typed-service.ts` exported `TransformHandlers`
2. Built declaration referenced it as `import("./typed-service").TransformHandlers<THandlers>`
3. When re-exported through multiple module boundaries (`@my/restate-primitives`), TypeScript couldn't properly resolve this reference
4. Type inference fell back to `any`

## The Solution
Remove the `export` keyword from `TransformHandlers` in `typed-service.ts`:

```typescript
// Before - EXPORTED
export type TransformHandlers<THandlers> = {
  [K in keyof THandlers]: TransformServiceHandler<
    ServiceHandlerContext,
    THandlers[K]
  >;
};

// After - NOT EXPORTED (like objects/workflows)
type TransformHandlers<THandlers> = {
  [K in keyof THandlers]: TransformServiceHandler<
    ServiceHandlerContext,
    THandlers[K]
  >;
};
```

## Result
After this change, the built declaration files inline the transform type directly:

```typescript
// Before (with reference)
ServiceDefinition<string, import("./typed-service").TransformHandlers<THandlers>>

// After (inlined like objects/workflows)
ServiceDefinition<string, { [K in keyof THandlers]: import("./common-types").TransformServiceHandler<import("./typed-service").ServiceHandlerContext, THandlers[K]>; }>
```

## Key Learnings

1. **Type Export Strategy**: Be careful about which types you export when building libraries. Internal types that are only used in return positions might be better left non-exported to ensure they get inlined.

2. **Module Boundaries**: TypeScript can struggle with type inference through multiple module re-exports, especially when types reference other imported types.

3. **Consistency Matters**: When you have similar patterns (services, objects, workflows), keep their type definitions consistent to avoid subtle inference issues.

4. **Declaration File Inspection**: When debugging type inference issues, always check the generated `.d.ts` files to see how TypeScript is actually representing your types.

5. **IDE vs Compiler**: Sometimes the IDE (VS Code) will show simplified types (like `any`) even when the actual TypeScript compiler knows the correct types. Always verify with actual compilation.

## Other Observations

- Arrow functions vs regular methods in class definitions didn't affect the issue
- The generic parameter patterns were correct (services don't need state generics like objects/workflows)
- SerdeClass instantiation needed to be consistent (`new SerdeClass<any>()` not `new SerdeClass()`)

## Testing Type Inference

To debug type inference issues:
1. Create minimal reproductions
2. Use intentional type errors to force TypeScript to show actual types
3. Check generated declaration files
4. Test at each layer of abstraction (direct usage vs through re-exports)