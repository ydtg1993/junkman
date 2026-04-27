type Listener = (e: Event) => void;
interface EventEntry {
    target: EventTarget;
    type: string;
    listener: Listener;
}

export class GlobalEventManager {
    private events: EventEntry[] = [];

    add(target: EventTarget, type: string, listener: Listener) {
        target.addEventListener(type, listener);
        this.events.push({ target, type, listener });
    }

    removeAll() {
        this.events.forEach(({ target, type, listener }) => {
            target.removeEventListener(type, listener);
        });
        this.events = [];
    }
}