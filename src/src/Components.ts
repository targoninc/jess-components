import { v4 } from "uuid";
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

function getDisabledClass(config: { disabled?: TypeOrSignal<boolean> }) {
    let disabledClass;
    if (isSignal(config.disabled)) {
        disabledClass = compute((newValue): string =>
            newValue ? "disabled" : "enabled", config.disabled as Signal<boolean>);
    } else {
        disabledClass = config.disabled ? "disabled" : "enabled";
    }

    return disabledClass;
}

export function button(config: ButtonConfig) {
    config.classes ??= [];

    return create("button")
        .applyGenericConfig(config)
        .onclick(config.onclick)
        .classes(getDisabledClass(config))
        .attributes("tabindex", config.tabindex ?? "0")
        .children(
            when(config.icon, () => create("div")
                .classes("jess", "flex", "align-children")
                .children(
                    icon(config.icon!)
                ).build()),
            when(config.text, () => text(<TextConfig>{
                text: config.text!,
            }))
        ).build();
}

export function input<T>(config: InputConfig<T>) {
    const errors = signal<string[]>([]);
    const hasError = compute((e) => [...e].length > 0, errors);
    const invalidClass = compute((has: boolean): string => has ? "invalid" : "valid", hasError);
    const touched = signal(false);
    const isPassword = config.type === InputType.password;
    const passwordClass: string = isPassword ? "jessc-password-input" : "_";
    const toggleState = signal(false);
    const configTypeSignal = config.type.constructor === Signal ? config.type as Signal<InputType> : signal(config.type as InputType);
    const actualType = compute((t: boolean) => t ? InputType.text : configTypeSignal.value, toggleState);
    let lastChange = 0;
    let debounceTimeout: number | Timer | undefined;

    function validate(newValue: any) {
        errors.value = [];
        if (config.debounce) {
            if (Date.now() - lastChange < config.debounce) {
                if (debounceTimeout) {
                    clearTimeout(debounceTimeout);
                }
                debounceTimeout = setTimeout(() => {
                    debounceTimeout = undefined;
                    validate(newValue);
                }, config.debounce);
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
                                config.onchange(e.target.value);
                            }
                            value.value = e.target.value;
                        })
                        .onchange((e: any) => {
                            touched.value = true;
                            lastChange = Date.now();
                            if (!isSignal(config.value)) {
                                validate(e.target.value);
                            }

                            if (config.onchange) {
                                config.onchange(e.target.value);
                            }
                            value.value = e.target.value;
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

export function textarea(config: TextareaConfig) {
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

export function errorList(errors: Signal<string[]>) {
    return signalMap(errors, create("div")
        .classes("flex-v", "jess", "jessc-error-list"), error);
}

export function error(error: StringOrSignal) {
    return create("span")
        .classes("jessc-error")
        .text(error)
        .build();
}

export function area(config: ContainerConfig) {
    config.classes ??= [];
    config.children ??= [];

    return create(config.tag ?? "div")
        .applyGenericConfig(config)
        .classes("jessc-area")
        .children(...config.children)
        .build();
}

export function container(config: ContainerConfig) {
    config.classes ??= [];
    config.children ??= [];

    return create(config.tag ?? "div")
        .applyGenericConfig(config)
        .classes("jessc-container")
        .children(...config.children)
        .build();
}

export function text(config: TextConfig) {
    return create(config.tag ?? "span")
        .applyGenericConfig(config)
        .text(config.text)
        .build();
}

export function heading(config: HeadingConfig) {
    return create(`h${config.level ?? 1}`)
        .applyGenericConfig(config)
        .text(config.text)
        .build();
}

export function icon(config: IconConfig) {
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

export function select(config: SelectConfig) {
    const options = config.options ?? signal([]);
    const value$ = config.value ?? signal(null);
    const selectId = v4();

    function setSelected(value: string) {
        const opts = document.querySelectorAll<HTMLOptionElement>(`select#${selectId} option`);
        opts.forEach(opt => opt.selected = opt.value === value);
    }

    value$.subscribe(setSelected);
    setSelected(value$.value);

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
                    .onchange(e => config.onchange ? config.onchange((e.target as HTMLInputElement).value) : undefined)
                    .value(value$),
                (option: SelectOption) =>
                create("option")
                    .value(option.id)
                    .text(option.name)
                    .build())
        ).build();
}

export function searchableSelect(config: SearchableSelectConfig) {
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
            when(optionsVisible, signalMap(filtered, create("div").classes("jessc-search-select-options", "flex-v"), (option: SelectOption) =>
                searchSelectOption({option, value, search, optionsVisible, selectedId})))
        ).build();
}

export function searchSelectOption(config: SelectOptionConfig) {
    let element: any;
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

export function checkbox(config: BooleanConfig) {
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

export function toggle(config: BooleanConfig) {
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
