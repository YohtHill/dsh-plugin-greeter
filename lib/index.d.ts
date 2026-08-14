import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Cordis plugin name used by loader diagnostics and context attribution. */
export declare const name = "greeter";
/** Durable-settings namespace owning the greeter configuration. */
export declare const SETTINGS_NAMESPACE: Branded<"SettingsNamespace">;
/** Services this plugin needs before it can mount. */
export declare const inject: string[];
/** User-selectable greeting styles; omit to draw a random tone per session. */
export declare const GREETING_STYLES: readonly ["minimal", "warm", "practical", "engineering", "playful", "calm"];
export type GreetingStyle = (typeof GREETING_STYLES)[number];
/** Plugin configuration accepted from cordis.yml. */
export interface Config {
    /** Fixed greeting style; omit to draw a random tone per session. */
    style?: GreetingStyle;
    /** Fixed greeting language, e.g. 'zh', 'en', 'ja'. Omit to mirror the language the user writes in. */
    language?: string;
    /** Custom greeting phrases; one is chosen per session. Use {name} for the user's name. */
    greetings?: string[];
    /** File name (inside the dsh home) where the remembered name is stored. */
    nameFile?: string;
    /** Greet proactively when a new session opens (no need to message first); default true. */
    proactive?: boolean;
}
/** Schemastery validation for {@link Config}; invalid values fail plugin load. */
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config: Config): void;
