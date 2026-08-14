import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Cordis plugin name used by loader diagnostics and context attribution. */
export declare const name = "greeter";
/** Durable-settings namespace owning the greeter configuration. */
export declare const SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
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
/** Configuration with defaults applied. */
export interface ResolvedConfig {
    style?: GreetingStyle;
    language?: string;
    greetings: string[];
    nameFile: string;
    proactive: boolean;
}
/** Durable store content (name + greeting rotation position). */
interface Store {
    name?: string;
    greetingIndex?: number;
}
/** Logging hook: module-level helpers cannot see ctx.logger, so callers pass it. */
type Warn = (message: string) => void;
/** Read the store; undefined when nothing is stored yet. */
export declare function readStore(file: string, warn?: Warn): Store | undefined;
/** Persist the store atomically (tmp + rename) so a crash never leaves half a JSON file. */
export declare function writeStore(file: string, data: Store): void;
/**
 * One-time migration from the legacy store name (`greeter-name.json`) to
 * `greeter-store.json`. Copies the data and keeps the old file as a
 * `.migrated` backup; idempotent — a second call is a no-op.
 */
export declare function migrateLegacyStore(home: string, warn?: Warn): void;
/**
 * Sanitize a user-supplied name before it is stored or injected into a prompt:
 * strip line breaks and quote characters (", `), cap the length, and drop
 * empties. A name is data, never instructions — this keeps `remember_name`
 * from becoming a prompt-injection surface that persists into every future
 * session.
 */
export declare function sanitizeName(name: string | undefined): string | undefined;
/**
 * Build the greeting instruction injected on the first step of a new session.
 * With a stored name and a configured pool, the exact phrase is chosen by
 * rotation; otherwise the model improvises a fresh greeting each session,
 * mirroring the language the user writes in (unless a fixed `language` is set)
 * and seeded with a random tone so the output differs even for identical input.
 */
export declare function greetingInstruction(userName: string | undefined, greetingIndex: number, config: ResolvedConfig): string;
export declare function apply(ctx: Context, config: Config): void;
export {};
