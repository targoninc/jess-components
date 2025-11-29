/**
 * Shared type and interface definitions used by `jess-components`.
 *
 * These types model the configuration objects accepted by the component
 * factory functions in `Components.ts` and are part of the public API.
 *
 * @module jess-components/types
 */
import {
    type CssClass,
    DomNode,
    type EventHandler,
    type HtmlPropertyValue, InputType, Signal,
    type StringOrSignal,
    type TypeOrSignal
} from "@targoninc/jess";

/**
 * Utility type to enumerate numeric literal union `[0, 1, ..., N-1]`.
 *
 * @typeParam N - Upper bound (exclusive).
 */
type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>

/**
 * Utility type that produces a numeric literal union from `F` (inclusive)
 * up to `T` (exclusive).
 *
 * @typeParam F - Start of range (inclusive).
 * @typeParam T - End of range (exclusive).
 */
type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

/**
 * Base configuration applied to most components.
 */
export interface BaseComponentConfig {
    classes?: StringOrSignal[];
    attributes?: StringOrSignal[];
    styles?: StringOrSignal[];
    id?: HtmlPropertyValue;
    title?: HtmlPropertyValue;
    tabindex?: HtmlPropertyValue;
    role?: HtmlPropertyValue;
    ariaLabel?: HtmlPropertyValue;
    css?: CssClass;
}

/**
 * Configuration for a clickable button component.
 */
export interface ButtonConfig extends BaseComponentConfig {
    text?: StringOrSignal;
    onclick: EventHandler<MouseEvent>;
    icon?: IconConfig;
    disabled?: TypeOrSignal<boolean>;
}

/**
 * Function used to validate values for changeable components.
 * Should return an array of error messages or `null/undefined` if valid.
 */
export type ValidatorFunction<T> = (value: T) => (string[] | null | undefined) | Promise<string[] | null | undefined>;

/**
 * Base configuration for input-like components that can change value.
 */
export interface ChangeableConfig<T = any> extends BaseComponentConfig {
    onchange?: (value: T) => void;
    validators?: ValidatorFunction<T>[];
    required?: boolean;
    autofocus?: boolean;
    label?: HtmlPropertyValue;
    disabled?: TypeOrSignal<boolean>;
}

/**
 * Configuration for the `input` component.
 *
 * @typeParam T - The value type of the input.
 */
export interface InputConfig<T> extends ChangeableConfig<T> {
    name: StringOrSignal;
    type: TypeOrSignal<InputType>;
    value: TypeOrSignal<T>;
    placeholder?: StringOrSignal;
    accept?: StringOrSignal;
    onkeydown?: EventHandler<KeyboardEvent>;
    infoLink?: StringOrSignal;
    infoText?: StringOrSignal;
    debounce?: number;
}

/**
 * Configuration for the `textarea` component.
 */
export interface TextareaConfig extends ChangeableConfig<string> {
    name: StringOrSignal;
    value: StringOrSignal;
    placeholder?: StringOrSignal;
    rows?: TypeOrSignal<number>;
    resize?: "both" | "horizontal" | "vertical" | "none";
}

/**
 * Configuration for a generic container/section component.
 */
export interface ContainerConfig extends BaseComponentConfig {
    tag: string;
    children: (DomNode)[];
}

/**
 * Configuration for generic text elements (e.g., `span`, `p`).
 */
export interface TextConfig extends BaseComponentConfig  {
    text: HtmlPropertyValue,
    tag: string
}

/**
 * Configuration for the `icon` component.
 */
export interface IconConfig extends BaseComponentConfig  {
    icon: StringOrSignal;
    adaptive?: boolean;
    isUrl?: TypeOrSignal<boolean>;
    onclick?: Function;
}

/**
 * Represents a single option for a select component.
 */
export interface SelectOption<T> extends BaseComponentConfig  {
    image?: string;
    imageIsUrl?: boolean;
    name: any;
    id: any | T;
}

/**
 * Internal configuration passed to `searchSelectOption`.
 */
export interface SelectOptionConfig<T> extends BaseComponentConfig  {
    option: SelectOption<T>;
    value: Signal<any>;
    search: Signal<string>;
    optionsVisible: Signal<boolean>;
    selectedId: Signal<any>;
}

/**
 * Configuration for the `searchableSelect` and `select` components.
 *
 * @typeParam T - The type of the selected value.
 */
export interface SearchableSelectConfig<T = string> extends ChangeableConfig<T> {
    options: Signal<SelectOption<T>[]>;
    value: Signal<T>;
}

/**
 * Alias for a simple select configuration.
 */
export type SelectConfig<T> = SearchableSelectConfig<T>;

/**
 * Configuration for the `heading` component.
 */
export interface HeadingConfig extends BaseComponentConfig  {
    level?: IntRange<1, 6>;
    text: StringOrSignal;
}

/**
 * Configuration for boolean components like `checkbox` and `toggle`.
 */
export interface BooleanConfig extends ChangeableConfig<boolean> {
    text: HtmlPropertyValue,
    checked: TypeOrSignal<boolean>,
    name?: HtmlPropertyValue,
}