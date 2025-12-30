/**
 * Component factory functions for building UI using the Jess runtime.
 *
 * All functions in this module return Jess `DomNode`/`AnyElement` instances
 * that can be composed and mounted by consumers. Most functions accept a
 * typed configuration object from `./Types`.
 *
 * @module jess-components/components
 */
import {v4} from "uuid";
import type {
    BooleanConfig,
    ButtonConfig,
    ContainerConfig,
    HeadingConfig,
    IconConfig,
    InputConfig,
    SearchableSelectConfig, SelectConfig,
    SelectOption,
    SelectOptionConfig,
    TextareaConfig,
    TextConfig,
} from "./Types.ts";
import {
    type AnyElement, asSignal,
    compute,
    create, type HtmlPropertyValue, InputType, isSignal,
    signal,
    Signal,
    signalMap,
    type StringOrSignal,
    type TypeOrSignal,
    when
} from "@targoninc/jess";
import {debounce} from "./Debounce.ts";

/**
 * Derives a `disabled`/`enabled` CSS class based on a boolean or signal.
 *
 * @internal
 */
function getDisabledClass(config: { disabled?: TypeOrSignal<boolean> }): TypeOrSignal<string> {
    let disabledClass;
    if (isSignal(config.disabled)) {
        disabledClass = compute((newValue): string =>
            newValue ? "disabled" : "enabled", config.disabled as Signal<boolean>);
    } else {
        disabledClass = config.disabled ? "disabled" : "enabled";
    }

    return disabledClass;
}

/**
 * Creates a button element.
 *
 * Renders optional icon and text, applies disabled styling from `config.disabled`,
 * and wires the `onclick` handler.
 *
 * @param config - {@link ButtonConfig} for the button.
 * @returns A Jess element representing a `<button>`.
 */
export function button(config: ButtonConfig): AnyElement {
    config.classes ??= [];

    return create("button")
        .applyGenericConfig(config)
        .onclick(config.onclick)
        .classes(getDisabledClass(config))
        .attributes("tabindex", config.tabindex ?? "0")
        .children(
            when(config.icon, () => create("div")
                .classes("jess", "flex", "align-children")
                .styles("pointer-events", "none")
                .children(
                    icon(config.icon!)
                ).build()),
            when(config.text, () => text(<TextConfig>{
                text: config.text!,
                styles: ["pointer-events", "none"]
            }))
        ).build();
}

/**
 * Creates a labeled input control with validation and optional debouncing.
 *
 * Shows error messages from `validators` and `required` when `touched`.
 * Supports password visibility toggle when `type === InputType.password`.
 *
 * @typeParam T - Value type for the input component.
 * @param config - {@link InputConfig} describing the input.
 * @returns A Jess element representing the input control.
 */
export function input<T>(config: InputConfig<T>): AnyElement {
    const errors = signal<string[]>([]);
    const hasError = compute((e) => [...e].length > 0, errors);
    const invalidClass = compute((has: boolean): string => has ? "invalid" : "valid", hasError);
    const touched = signal(false);
    const isPassword = config.type === InputType.password;
    const passwordClass: string = isPassword ? "jessc-password-input" : "_";
    const toggleState = signal(false);
    const configTypeSignal = config.type.constructor === Signal ? config.type as Signal<InputType> : signal(config.type as InputType);
    const actualType = compute((t: boolean) => t ? InputType.text : configTypeSignal.value, toggleState);
    const inputId = v4();
    let lastChange = 0;

    function validate(newValue: any) {
        errors.value = [];
        if (config.debounce) {
            if (Date.now() - lastChange < config.debounce) {
                debounce(inputId + "validate", () => validate(newValue), config.debounce);
                return;
            }
        }
        config.validators?.forEach(async valFunction => {
            const valErrors = await valFunction(newValue);
            if (valErrors) {
                errors.value = errors.value.concat(valErrors);
            }
        });
        if (config.required && (newValue === null || newValue === undefined || newValue === "") && touched.value) {
            errors.value = errors.value.concat(["This field is required."]);
        }
    }

    let value: Signal<HtmlPropertyValue> = config.value as Signal<HtmlPropertyValue>;
    if (isSignal(config.value)) {
        asSignal(config.value).subscribe(validate);
        validate(asSignal(config.value).value);
    } else {
        validate(config.value as T);
        // @ts-ignore
        value = signal<T>(config.value ?? "");
    }

    return create("div")
        .classes("flex-v", "jess")
        .children(
            create("label")
                .classes("flex-v", "jess", getDisabledClass(config))
                .text(config.label ?? "")
                .for(config.title)
                .children(
                    when(config.infoLink, create("a")
                        .text(config.infoText ?? config.infoLink)
                        .href(config.infoLink)
                        .target("_blank")
                        .classes("flex")
                        .children(
                            icon({
                                icon: "info",
                                adaptive: true,
                            }),
                        ).build()),
                    create("input")
                        .classes(invalidClass, passwordClass)
                        .applyGenericConfig(config)
                        .type(actualType)
                        .value(value as HtmlPropertyValue)
                        .accept(config.accept ?? "")
                        .required(config.required ?? false)
                        .placeholder(config.placeholder ?? "")
                        .attributes("autofocus", config.autofocus ?? "")
                        .oninput((e: any) => {
                            touched.value = true;
                            lastChange = Date.now();
                            if (!isSignal(config.value)) {
                                validate(e.target.value);
                            }

                            if (config.onchange) {
                                // @ts-expect-error
                                debounce(inputId + "change", () => config.onchange(e.target.value), config.debounce);
                            }
                            debounce(inputId + "value", () => value.value = e.target.value, config.debounce);
                        })
                        .onchange((e: any) => {
                            touched.value = true;
                            lastChange = Date.now();
                            if (!isSignal(config.value)) {
                                validate(e.target.value);
                            }

                            if (config.onchange) {
                                // @ts-expect-error
                                debounce(inputId + "change", () => config.onchange(e.target.value), config.debounce);
                            }
                            debounce(inputId + "value", () => value.value = e.target.value, config.debounce);
                        })
                        .onkeydown(config.onkeydown ?? (() => {
                        }))
                        .name(config.name)
                        .build(),
                    when(isPassword, eyeButton(toggleState, () => {
                        toggleState.value = !toggleState.value;
                    })),
                ).build(),
            when(hasError, errorList(errors))
        ).build();
}

/**
 * Helper that renders an eye icon button used by password inputs.
 *
 * @param toggleState - Signal toggled when the button is clicked.
 * @param onClick - Callback invoked on click.
 * @returns A Jess element representing the eye icon button.
 */
export function eyeButton(toggleState: Signal<boolean>, onClick: Function): AnyElement {
    const icon$ = compute((t: boolean): string => t ? "visibility" : "visibility_off", toggleState);

    return create("div")
        .classes("jessc-eye-button")
        .onclick(onClick)
        .children(
            icon({
                icon: icon$,
                adaptive: true,
                isUrl: false,
            })
        ).build();
}

/**
 * Creates a labeled `<textarea>` with validation handling.
 *
 * @param config - {@link TextareaConfig} for the textarea.
 * @returns A Jess element representing the textarea control.
 */
export function textarea(config: TextareaConfig): AnyElement {
    const errors = signal<string[]>([]);
    const hasError = compute((e) => e.length > 0, errors);
    const invalidClass = compute((has: boolean): string => has ? "invalid" : "valid", hasError);

    function validate(newValue: any) {
        errors.value = [];
        config.validators?.forEach(async valFunction => {
            const valErrors = await valFunction(newValue);
            if (valErrors) {
                errors.value = errors.value.concat(valErrors);
            }
        });
        if (config.required && (newValue === null || newValue === undefined || newValue === "")) {
            errors.value = errors.value.concat(["This field is required."]);
        }
    }

    if (isSignal(config.value)) {
        asSignal(config.value).subscribe(validate);
        validate(asSignal(config.value).value);
    } else {
        validate(config.value as string);
    }

    return create("div")
        .classes("flex-v", "jess", ...config.classes ?? [])
        .children(
            create("label")
                .classes("flex-v", "jess", getDisabledClass(config))
                .text(config.label ?? "")
                .for(config.name)
                .children(
                    create("textarea")
                        .classes(invalidClass)
                        .applyGenericConfig(config)
                        .styles("resize", config.resize ?? "vertical")
                        .value(config.value)
                        .required(config.required ?? false)
                        .placeholder(config.placeholder ?? "")
                        .attributes("autofocus", config.autofocus ?? "", "rows", config.rows?.toString() ?? "3")
                        .oninput((e: any) => {
                            if (!isSignal(config.value)) {
                                validate(e.target.value);
                            }

                            if (config.onchange) {
                                config.onchange(e.target.value);
                            }
                        })
                        .onchange((e: any) => {
                            if (!isSignal(config.value)) {
                                validate(e.target.value);
                            }

                            if (config.onchange) {
                                config.onchange(e.target.value);
                            }
                        })
                        .name(config.name)
                        .build(),
                ).build(),
            when(hasError, errorList(errors))
        ).build();
}

/**
 * Renders a list of validation errors.
 *
 * @param errors - Signal containing error messages.
 * @returns A Jess element with error items.
 */
export function errorList(errors: Signal<string[]>): any {
    return signalMap(errors, create("div")
        .classes("flex-v", "jess", "jessc-error-list"), error);
}

/**
 * Renders a single error message.
 *
 * @param error - Error message content.
 * @returns A Jess element representing the error line.
 */
export function error(error: StringOrSignal): AnyElement {
    return create("span")
        .classes("jessc-error")
        .text(error)
        .build();
}

/**
 * Creates a simple bordered area container.
 *
 * @param config - {@link ContainerConfig} for the container.
 * @returns A Jess element representing the area container.
 */
export function area(config: ContainerConfig): AnyElement {
    config.classes ??= [];
    config.children ??= [];

    return create(config.tag ?? "div")
        .applyGenericConfig(config)
        .classes("jessc-area")
        .children(...config.children)
        .build();
}

/**
 * Creates a generic container element with provided `tag` and `children`.
 *
 * @param config - {@link ContainerConfig}.
 * @returns A Jess element for the container.
 */
export function container(config: ContainerConfig): AnyElement {
    config.classes ??= [];
    config.children ??= [];

    return create(config.tag ?? "div")
        .applyGenericConfig(config)
        .classes("jessc-container")
        .children(...config.children)
        .build();
}

/**
 * Renders text inside a given `tag` (e.g., `span`, `p`).
 *
 * @param config - {@link TextConfig}.
 * @returns A Jess element for the text node.
 */
export function text(config: TextConfig): AnyElement {
    return create(config.tag ?? "span")
        .applyGenericConfig(config)
        .text(config.text)
        .build();
}

/**
 * Renders a heading (h1-h6) based on `level`.
 *
 * @param config - {@link HeadingConfig}.
 * @returns A Jess heading element.
 */
export function heading(config: HeadingConfig): AnyElement {
    return create(`h${config.level ?? 1}`)
        .applyGenericConfig(config)
        .text(config.text)
        .build();
}

/**
 * Renders an icon element. If `isUrl` is truthy, renders an `<img>`; otherwise,
 * renders an inline icon. When `adaptive` is true, adapts styles to context.
 *
 * @param config - {@link IconConfig} specifying icon source and behavior.
 * @returns A signal of Jess element, allowing updates when icon-related signals change.
 */
export function icon(config: IconConfig): Signal<AnyElement> {
    const icon = config.icon;
    const iconClass = config.adaptive ? "adaptive-icon" : "static-icon";
    const pointerClass = config.title ? "_" : "no-pointer";

    return compute((isImage: boolean) => {
        if (!isImage) {
            return create("i")
                .applyGenericConfig(config)
                .classes(iconClass, "material-symbols-outlined", pointerClass)
                .text(icon)
                .onclick(config.onclick)
                .build();
        }

        return create("img")
            .applyGenericConfig(config)
            .classes(iconClass, pointerClass)
            .attributes("src", icon)
            .onclick(config.onclick)
            .build();
    }, asSignal(config.isUrl ?? false) as Signal<boolean>);
}

/**
 * Renders a non-searchable select control.
 *
 * @typeParam T - Type of the option value.
 * @param config - {@link SelectConfig} for the select.
 * @returns A Jess element for the select control.
 */
export function select<T = any>(config: SelectConfig<T>): AnyElement {
    const options = config.options ?? signal([]);
    const value$ = config.value ?? signal(null);
    const selectId = v4();

    return create("div")
        .applyGenericConfig(config)
        .classes("jessc-select", "flex-v", "relative")
        .children(
            when(config.label, create("label")
                .classes("jess")
                .text(config.label)
                .build()),
            signalMap(options,
                create("select")
                    .classes("jessc-select-inner")
                    .id(selectId)
                    .onchange(e => {
                        value$.value = (e.target as HTMLSelectElement).value as T;
                        config.onchange ? config.onchange((e.target as HTMLSelectElement).value as T) : undefined;
                    }),
                (option: SelectOption<T>) => {
                    return create("option")
                        .value(option.id)
                        .text(option.name)
                        .selected(compute(v => v === option.id, value$) as HtmlPropertyValue)
                        .build();
                })
        ).build();
}

/**
 * Renders a searchable select control with a filterable dropdown.
 *
 * @typeParam T - Type of the option value.
 * @param config - {@link SearchableSelectConfig} for the control.
 * @returns A Jess element for the searchable select.
 */
export function searchableSelect<T = any>(config: SearchableSelectConfig<T>): AnyElement {
    const options = config.options ?? signal([]);
    const value = config.value ?? signal(null);

    const search = signal(options.value.find(o => o.id === value.value)?.name ?? "");
    value.subscribe((newVal) => {
        search.value = options.value.find(o => o.id === newVal)?.name ?? "";
    });
    const optionsVisible = signal(false);
    const filtered = signal(options.value);
    const selectedIndex = signal(0);
    const filter = () => {
        //filtered.value = options.value.filter(o => o.name.toLowerCase().includes(search.value.toLowerCase()));
        selectedIndex.value = options.value.findIndex(o => o.name.toLowerCase().includes(search.value.toLowerCase()));
    }
    options.subscribe(filter);
    search.subscribe(filter);
    filter();
    const selectedId = signal(options.value[0]?.id ?? null);
    const updateSelectedId = () => {
        selectedId.value = filtered.value[selectedIndex.value]?.id;
    }
    selectedIndex.subscribe(updateSelectedId);
    filtered.subscribe(updateSelectedId);
    updateSelectedId();
    const currentIcon = compute((vis: boolean): string => vis ? "arrow_drop_up" : "arrow_drop_down", optionsVisible);

    return create("div")
        .applyGenericConfig(config)
        .classes("jessc-search-select", "flex-v", "relative")
        .children(
            when(config.label, create("label")
                .classes("jess")
                .text(config.label)
                .build()),
            create("div")
                .classes("flex", "jessc-search-select-visible", "jess")
                .children(
                    create("input")
                        .classes("jess", "jessc-search-select-input", getDisabledClass(config))
                        .value(search)
                        .onfocus(() => {
                            optionsVisible.value = true;
                        })
                        .onkeydown((e: any) => {
                            switch (e.key) {
                                case "Enter":
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const selectedOption = filtered.value[selectedIndex.value];
                                    value.value = selectedOption?.id ?? value.value;
                                    search.value = selectedOption?.name ?? search.value;
                                    optionsVisible.value = false;
                                    break;
                                case "ArrowDown":
                                    e.preventDefault();
                                    e.stopPropagation();
                                    selectedIndex.value = (selectedIndex.value + 1) % filtered.value.length;
                                    break;
                                case "ArrowUp":
                                    e.preventDefault();
                                    e.stopPropagation();
                                    selectedIndex.value = (selectedIndex.value - 1 + filtered.value.length) % filtered.value.length;
                                    break;
                                case "Escape":
                                case "Tab":
                                    optionsVisible.value = false;
                                    break;
                                default:
                                    if ((e.keyCode > 32 && e.keyCode < 126) || e.key === "Backspace") {
                                        setTimeout(() => {
                                            search.value = e.target.value;
                                        });
                                    }
                                    break;
                            }
                        })
                        .build(),
                    create("div")
                        .classes("jessc-search-select-dropdown", getDisabledClass(config))
                        .onclick(() => {
                            optionsVisible.value = !optionsVisible.value;
                        })
                        .children(
                            icon(<IconConfig>{
                                icon: currentIcon,
                                adaptive: true,
                                isUrl: false,
                            })
                        ).build()
                ).build(),
            when(optionsVisible, signalMap(filtered, create("div").classes("jessc-search-select-options", "flex-v"), (option: SelectOption<T>) =>
                searchSelectOption<T>({option, value, search, optionsVisible, selectedId})))
        ).build();
}

/**
 * Renders a single selectable option for the searchable select dropdown.
 *
 * @typeParam T - Type of the option value.
 * @param config - {@link SelectOptionConfig} for the option.
 * @returns A Jess element representing the option.
 */
export function searchSelectOption<T = any>(config: SelectOptionConfig<T>): AnyElement {
    let element: AnyElement;
    const selectedClass = compute((id: string): string => {
        element?.scrollIntoView({behavior: "smooth", block: "nearest"});
        return id === config.option.id ? "selected" : "_";
    }, config.selectedId);

    element = create("div")
        .classes("jessc-search-select-option", "flex", "gap", "padded", selectedClass)
        .onclick(() => {
            config.value.value = config.option.id;
            config.search.value = config.option.name;
            config.optionsVisible.value = false;
        })
        .children(
            when(config.option.image, create("div")
                .children(
                    icon({
                        icon: config.option.image ?? "",
                        isUrl: config.option.imageIsUrl,
                        adaptive: true
                    })
                ).build()),
            create("span")
                .text(config.option.name)
                .build()
        ).build();
    return element;
}

/**
 * Renders a checkbox control with label and validation support.
 *
 * @param config - {@link BooleanConfig}.
 * @returns A Jess element for the checkbox.
 */
export function checkbox(config: BooleanConfig): AnyElement {
    const errors = signal<string[]>([]);
    const hasError = compute((e) => e.length > 0, errors);
    const invalidClass = compute((has: boolean): string => has ? "invalid" : "valid", hasError);

    function validate(newValue: boolean) {
        errors.value = [];
        config.validators?.forEach(async valFunction => {
            const valErrors = await valFunction(newValue);
            if (valErrors) {
                errors.value = errors.value.concat(valErrors);
            }
        });
        if (config.required && (newValue === null || newValue === undefined || newValue === false)) {
            errors.value = errors.value.concat(["This field is required."]);
        }
    }

    let checked: StringOrSignal;
    if (isSignal(config.checked)) {
        const sig = config.checked as Signal<boolean>;
        sig.subscribe(validate);
        validate(sig.value);
        checked = compute(c => c.toString(), sig);
    } else {
        validate(config.checked as boolean);
        checked = config.checked.toString();
    }

    return create("div")
        .classes("flex-v", "jess")
        .children(
            create("label")
                .applyGenericConfig(config)
                .classes("jessc-checkbox-container", invalidClass, getDisabledClass(config))
                .text(config.text)
                .children(
                    create("input")
                        .type(InputType.checkbox)
                        .name(config.name ?? "")
                        .id(config.name ?? "")
                        .required(config.required ?? false)
                        .checked(checked)
                        .onclick((e) => {
                            const c = (e.target as HTMLInputElement).checked;
                            if (!isSignal(config.checked)) {
                                validate(c);
                            }

                            config.onchange && config.onchange(c);
                        })
                        .build(),
                    create("span")
                        .classes("jessc-checkmark")
                        .children(
                            when(config.checked, create("span")
                                .classes("jessc-checkmark-icon")
                                .text("✓")
                                .build())
                        ).build(),
                ).build(),
            when(hasError, errorList(errors))
        ).build();
}

/**
 * Renders a binary on/off toggle switch with label and validation support.
 *
 * @param config - {@link BooleanConfig}.
 * @returns A Jess element for the toggle switch.
 */
export function toggle(config: BooleanConfig): AnyElement {
    const errors = signal<string[]>([]);
    const hasError = compute((e) => e.length > 0, errors);
    const invalidClass = compute((has: boolean): string => has ? "invalid" : "valid", hasError);

    function validate(newValue: boolean) {
        errors.value = [];
        config.validators?.forEach(async valFunction => {
            const valErrors = await valFunction(newValue);
            if (valErrors) {
                errors.value = errors.value.concat(valErrors);
            }
        });
        if (config.required && (newValue === null || newValue === undefined || newValue === false)) {
            errors.value = errors.value.concat(["This field is required."]);
        }
    }

    if (isSignal(config.checked)) {
        const sig = config.checked as Signal<boolean>;
        sig.subscribe(validate);
        validate(sig.value);
    } else {
        validate(config.checked as boolean);
    }

    return create("div")
        .classes("flex-v", "jess")
        .children(
            create("label")
                .applyGenericConfig(config)
                .classes("flex", "gap", "align-children", invalidClass, getDisabledClass(config))
                .for(config.name ?? "")
                .children(
                    create("input")
                        .type(InputType.checkbox)
                        .classes("hidden", "jessc-slider")
                        .id(config.name ?? "")
                        .required(config.required ?? false)
                        .checked(config.checked as HtmlPropertyValue)
                        .onclick((e) => {
                            const checked = (e.target as HTMLInputElement).checked;
                            if (!isSignal(config.checked)) {
                                validate(checked);
                            }

                            config.onchange && config.onchange(checked);
                        })
                        .build(),
                    create("div")
                        .classes("jessc-toggle-container")
                        .children(
                            create("span")
                                .classes("jessc-toggle-slider")
                                .build()
                        ).build(),
                    create("span")
                        .classes("jessc-toggle-text")
                        .text(config.text ?? "")
                        .build(),
                ).build(),
            when(hasError, errorList(errors))
        ).build();
}
