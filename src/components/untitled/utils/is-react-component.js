// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// Only types, import paths, utility prefixes, and the reset marker differ.
/**
 * Checks if a given value is a function component.
 */
export const isFunctionComponent = (component) => {
    return typeof component === "function";
};
/**
 * Checks if a given value is a class component.
 */
export const isClassComponent = (component) => {
    return typeof component === "function" && component.prototype && (!!component.prototype.isReactComponent || !!component.prototype.render);
};
/**
 * Checks if a given value is a forward ref component.
 */
export const isForwardRefComponent = (component) => {
    return typeof component === "object" && component !== null && component.$$typeof.toString() === "Symbol(react.forward_ref)";
};
/**
 * Checks if a given value is a valid React component.
 */
export const isReactComponent = (component) => {
    return isFunctionComponent(component) || isForwardRefComponent(component) || isClassComponent(component);
};
