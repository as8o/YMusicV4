// The watch page minus the player: video metadata + description (yt/video-details), comments and
// replies (yt/comments), posting a comment (yt/comment/create). Kotlin twin: yt/YtVideoDetails.kt.

import { onAccept } from "../../transport";
import { JsEngineErrorImpl, commandHandler } from "../../protocol/command";
import { hostLogger } from "../../protocol/logger";
import { innertubeJson } from "./innertube";
import { asString, get, isObj, textOf, walk } from "./scan";
import { EDIT_COMMENT, EDIT_REPLY, commentPageOf, videoDetailsOf } from "./watchParse";

async function writeJson(out: PipeSink, value: object): Promise<void> {
  const p = out.writeObjectAsJson(value as Record<string, unknown>);
  if (p) await p;
}

function requiredString(args: Record<string, unknown>, name: string, command: string): string {
  const v = asString(args[name]);
  if (v === undefined || v === "") throw JsEngineErrorImpl.parse(command + " needs " + name);
  return v;
}

// {"videoId"} -> WireVideoDetails.
onAccept(
  "yt/video-details",
  commandHandler(async (src, out) => {
    const args = await src.readJsonObject();
    const videoId = requiredString(args, "videoId", "yt/video-details");
    const root = await innertubeJson(
      "next",
      { "videoId": videoId },
      hostLogger(args, "yt/video-details"),
    );
    const details = videoDetailsOf(root);
    // Diagnostic-only, allowlisted metadata. Never serialize the /next or /player
    // response: it contains private account identifiers and action tokens.
    const report: string[] = ["Video " + videoId, "next factoids=" + (details["factoids"]?.length ?? 0)];
    let headerCount = 0;
    walk(root, (key, value) => {
      if (key !== "videoDescriptionHeaderRenderer" || !isObj(value)) return;
      headerCount++;
      report.push("header[" + headerCount + "] keys=" + Object.keys(value).filter(k => /date|factoid|view|time/i.test(k)).join(","));
      report.push("header publishDate=" + (textOf(value["publishDate"]) ?? asString(value["publishDate"]) ?? "(not text)"));
      const facts = value["factoid"];
      if (Array.isArray(facts)) facts.slice(0, 8).forEach((node, index) => {
        if (!isObj(node)) return;
        const kind = ["factoidRenderer", "viewCountFactoidRenderer", "uploadTimeFactoidRenderer"].find(k => node[k] !== undefined);
        if (!kind) return;
        const renderer = node[kind];
        const inner = kind === "factoidRenderer" ? renderer : get(renderer, "factoid", "factoidRenderer");
        report.push("fact[" + index + "] kind=" + kind + " keys=" + (isObj(renderer) ? Object.keys(renderer).filter(k => /factoid|date|time|upload|view|value|label/i.test(k)).join(",") : "none"));
        report.push("fact[" + index + "] value=" + (textOf(get(inner, "value")) ?? "(missing)") + " label=" + (textOf(get(inner, "label")) ?? "(missing)"));
      });
      return true;
    });
    report.push("headers=" + headerCount);
    report.push("next likeCount=" + (details["likeCount"] ?? "(missing)"));
    // Newer /next responses may put a recent premiere date on the header
    // instead of inside a factoidRenderer.
    let headerDate: string | undefined;
    walk(root, (key, node) => {
      if (key !== "videoDescriptionHeaderRenderer" || !isObj(node)) return;
      headerDate ??= textOf(node["publishDate"]) ?? asString(node["publishDate"]);
      return true;
    });
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const dateFact = (raw: string): { "value": string; "label": string } | undefined => {
      const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(raw);
      const display = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i.exec(raw);
      const year = iso ? Number(iso[1]) : display ? Number(display[3]) : NaN;
      const month = iso ? Number(iso[2]) : display ? months.findIndex(m => m.toLowerCase() === display[1]?.toLowerCase()) + 1 : NaN;
      const day = iso ? Number(iso[3]) : display ? Number(display[2]) : NaN;
      if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) ||
          month < 1 || month > 12 || day < 1 || day > 31 ||
          new Date(Date.UTC(year, month - 1, day)).getUTCDate() !== day) return undefined;
      return { "value": months[month - 1]! + " " + day, "label": String(year) };
    };
    const originalFacts = details["factoids"] ?? [];
    const hasDate = originalFacts.some(f => /^\d{4}$/.test(f["label"]) || /date|publish|premier/i.test(f["label"]));
    const nextDate = headerDate ? dateFact(headerDate) : undefined;
    if (!hasDate && nextDate) details["factoids"] = [...originalFacts, nextDate];

    report.push("next header date=" + (headerDate ?? "(missing)") + " / parsed=" + (nextDate ? nextDate["value"] + " " + nextDate["label"] : "(missing)"));

    // Some newly published videos omit videoDescriptionHeaderRenderer entirely in /next.
    // Only in that case request /player metadata; never replace working /next facts.
    if (originalFacts.length === 0) {
      report.push("fallback=attempt /player");
      try {
        const player = await innertubeJson(
          "player", { "videoId": videoId }, hostLogger(args, "yt/video-details/fallback"),
        );
        const micro = (player["microformat"] as Record<string, unknown> | undefined)
          ?.["playerMicroformatRenderer"] as Record<string, unknown> | undefined;
        const video = player["videoDetails"] as Record<string, unknown> | undefined;
        report.push("player microformat keys=" + (micro ? Object.keys(micro).filter(k => /date|live|time|publish|upload/i.test(k)).join(",") : "(absent)"));
        report.push("player viewCount=" + (asString(video?.["viewCount"]) ?? "(missing)"));
        report.push("player publishDate=" + (asString(micro?.["publishDate"]) ?? "(missing)") + " uploadDate=" + (asString(micro?.["uploadDate"]) ?? "(missing)"));
        const facts: Array<{value: string; label: string}> = [];
        // The like count comes from /next's rating controls even when headline facts are absent.
        if (details["likeCount"]) facts.push({ "value": details["likeCount"], "label": "Likes" });
        const views = asString(video?.["viewCount"]);
        if (views) facts.push({ "value": views.replace(/\B(?=(\d{3})+(?!\d))/g, ","), "label": "Views" });
        const published = asString(micro?.["publishDate"]) ?? asString(micro?.["uploadDate"]);
        const fallbackDate = published ? dateFact(published) : undefined;
        if (!nextDate && fallbackDate) facts.push(fallbackDate);
        if (facts.length > 0) details["factoids"] = [...facts, ...(nextDate ? [nextDate] : [])];
        report.push("fallback date parsed=" + (fallbackDate ? fallbackDate["value"] + " " + fallbackDate["label"] : "(missing)"));
        report.push("fallback facts=" + facts.map(f => f["label"] + ":" + f["value"]).join(" | "));
      } catch (error) {
        report.push("fallback failed=" + (error instanceof Error ? error.name : "unknown"));
        // A supplementary metadata request must not break details, comments, or rating.
      }
    }
    report.push("final facts=" + (details["factoids"] ?? []).map(f => f["label"] + ":" + f["value"]).join(" | "));
    details["diagnostic"] = report.join("\n");
    // Use the existing, proven factoids wire path for the diagnostic-only menu.
    // The UI filters these entries out of the visible statistics.
    details["factoids"] = [...(details["factoids"] ?? []),
      ...report.map((line, i) => ({ "label": "DBG " + i, "value": line }))];
    await writeJson(out, details);
  }),
);

// {"continuation"} -> WireCommentPage: a video's comments (its details' commentsContinuation, a
// sort chip's token, or a page's continuation) or a thread's replies (repliesContinuation).
onAccept(
  "yt/comments",
  commandHandler(async (src, out) => {
    const args = await src.readJsonObject();
    const continuation = requiredString(args, "continuation", "yt/comments");
    const root = await innertubeJson(
      "next",
      { "continuation": continuation },
      hostLogger(args, "yt/comments"),
    );
    await writeJson(out, commentPageOf(root));
  }),
);

// The rating endpoint by the viewer's new status.
const RATE_ENDPOINTS: Record<string, string> = {
  "LIKE": "like/like",
  "DISLIKE": "like/dislike",
  "INDIFFERENT": "like/removelike",
};

// {"videoId","status","token"} -> {}. `status` is the viewer's new rating (LIKE | DISLIKE |
// INDIFFERENT); `token` is the details' rateTokens entry for it.
onAccept(
  "yt/video/rate",
  commandHandler(async (src, out) => {
    const args = await src.readJsonObject();
    const videoId = requiredString(args, "videoId", "yt/video/rate");
    const status = requiredString(args, "status", "yt/video/rate");
    const token = requiredString(args, "token", "yt/video/rate");
    const endpoint = RATE_ENDPOINTS[status];
    if (endpoint === undefined) throw JsEngineErrorImpl.parse("yt/video/rate status " + status);
    await innertubeJson(
      endpoint,
      { "target": { "videoId": videoId }, "params": token },
      hostLogger(args, "yt/video/rate"),
    );
    await writeJson(out, {});
  }),
);

// {"token","text"} -> the posted WireComment. `token` is a page's createToken.
onAccept(
  "yt/comment/create",
  commandHandler(async (src, out) => {
    const args = await src.readJsonObject();
    const token = requiredString(args, "token", "yt/comment/create");
    const text = requiredString(args, "text", "yt/comment/create");
    const root = await innertubeJson(
      "comment/create_comment",
      { "createCommentParams": token, "commentText": text },
      hostLogger(args, "yt/comment/create"),
    );
    const posted = commentPageOf(root)["comments"][0];
    if (posted === undefined) {
      throw new JsEngineErrorImpl("create_comment answered without the posted comment", "E20093");
    }
    await writeJson(out, posted);
  }),
);

// {"token"} -> {}. `token` is one of a comment's like / unlike / dislike / undislike / delete tokens.
onAccept(
  "yt/comment/action",
  commandHandler(async (src, out) => {
    const args = await src.readJsonObject();
    const token = requiredString(args, "token", "yt/comment/action");
    await innertubeJson(
      "comment/perform_comment_action",
      { "actions": [token] },
      hostLogger(args, "yt/comment/action"),
    );
    await writeJson(out, {});
  }),
);

// {"token","text"} -> the posted reply. `token` is the parent comment's replyToken.
onAccept(
  "yt/comment/reply",
  commandHandler(async (src, out) => {
    const args = await src.readJsonObject();
    const token = requiredString(args, "token", "yt/comment/reply");
    const text = requiredString(args, "text", "yt/comment/reply");
    const root = await innertubeJson(
      "comment/create_comment_reply",
      { "createReplyParams": token, "commentText": text },
      hostLogger(args, "yt/comment/reply"),
    );
    const posted = commentPageOf(root)["comments"][0];
    if (posted === undefined) {
      throw new JsEngineErrorImpl(
        "create_comment_reply answered without the posted reply",
        "E20098",
      );
    }
    await writeJson(out, posted);
  }),
);

// {"token","text"} -> {}. `token` is a comment's editToken; `text` replaces the comment's text.
onAccept(
  "yt/comment/edit",
  commandHandler(async (src, out) => {
    const args = await src.readJsonObject();
    const token = requiredString(args, "token", "yt/comment/edit");
    const text = requiredString(args, "text", "yt/comment/edit");
    const log = hostLogger(args, "yt/comment/edit");
    if (token.indexOf(EDIT_COMMENT) === 0) {
      await innertubeJson(
        "comment/update_comment",
        { "updateCommentParams": token.slice(EDIT_COMMENT.length), "commentText": text },
        log,
      );
    } else if (token.indexOf(EDIT_REPLY) === 0) {
      await innertubeJson(
        "comment/update_comment_reply",
        { "updateReplyParams": token.slice(EDIT_REPLY.length), "replyText": text },
        log,
      );
    } else {
      throw JsEngineErrorImpl.parse("yt/comment/edit token kind");
    }
    await writeJson(out, {});
  }),
);
