# Example usage - Button

```typescript
import {button} from "@targoninc/jess-components";

const disabled = signal(false);

const element = button({
    text: "Info",
    disabled: disabled,
    icon: {
        icon: "/assets/buttonIcon.svg",
        adaptive: true,
        isUrl: true
    },
    onclick: () => {
        console.log("button clicked");
        disabled.value = true;
    },
});

document.body.appendChild(element);
```
