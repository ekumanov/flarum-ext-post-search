type KeyboardEventHandler = (event: KeyboardEvent) => void;
type ShouldHandle = (event: KeyboardEvent) => boolean;

/**
 * Handles keyboard navigation in dropdown lists.
 * Adapted from flamarkt/backoffice, modernized to use event.key instead of keyCodes.
 */
export default class KeyboardNavigatable {
    protected callbacks = new Map<string, KeyboardEventHandler>();
    protected whenCallback: ShouldHandle = () => true;

    onUp(callback: KeyboardEventHandler): this {
        this.callbacks.set('ArrowUp', (e) => {
            e.preventDefault();
            callback(e);
        });
        return this;
    }

    onDown(callback: KeyboardEventHandler): this {
        this.callbacks.set('ArrowDown', (e) => {
            e.preventDefault();
            callback(e);
        });
        return this;
    }

    onSelect(callback: KeyboardEventHandler, ignoreTabPress: boolean = false): this {
        const handler: KeyboardEventHandler = (e) => {
            e.preventDefault();
            callback(e);
        };

        if (!ignoreTabPress) this.callbacks.set('Tab', handler);
        this.callbacks.set('Enter', handler);

        return this;
    }

    onRemove(callback: KeyboardEventHandler): this {
        this.callbacks.set('Backspace', (e) => {
            if ((e.target as HTMLInputElement).value === '') {
                e.preventDefault();
                callback(e);
            }
        });
        return this;
    }

    when(callback: ShouldHandle): this {
        this.whenCallback = callback;
        return this;
    }

    navigate(event: KeyboardEvent): void {
        if (this.whenCallback(event) === false) {
            return;
        }

        const handler = this.callbacks.get(event.key);

        if (handler) {
            handler(event);
        }
    }
}
