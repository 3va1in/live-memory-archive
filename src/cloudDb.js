import { SUPABASE_CONFIG, isSupabaseConfigured } from "./config.js";

let client;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!window.supabase?.createClient) {
    throw new Error("Supabase SDK 未加载。请确认网络可以访问 jsDelivr CDN。");
  }
  if (!client) {
    client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }
  return client;
}

export async function getSession() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signIn(email, password) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.session) {
    await ensureProfile(data.session);
  }
  return data.session;
}

export async function resolveLoginIdentifier(identifier) {
  const value = String(identifier || "").trim();
  if (value.includes("@")) return value.toLowerCase();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("profiles").select("email").eq("username", value).single();
  if (error) throw new Error("用户名不存在");
  return data.email;
}

export async function ensureProfile(session) {
  if (!session?.user) return;
  const username = session.user.user_metadata?.username;
  const email = session.user.email;
  if (!username || !email) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: session.user.id,
      username,
      email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.warn("Profile sync failed:", error.message);
  }
}

export async function signUp(email, password, username = "") {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  if (data.session) {
    await ensureProfile(data.session);
  } else if (data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: data.user.id,
        username,
        email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (profileError) {
      console.warn("Profile will be created after first sign in:", profileError.message);
    }
  }
  return data.session;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

function toDbConcert(concert) {
  return {
    title: concert.title,
    project: concert.project,
    projects: concert.projects || [],
    date: concert.date || null,
    city: concert.city,
    venue: concert.venue,
    address: concert.address,
    theme_color: concert.themeColor,
    tags: concert.tags || [],
    note: concert.note,
    thoughts: concert.thoughts,
    favorite_song: concert.favoriteSong,
    setlist: concert.setlist || [],
    ticket_info: concert.ticketInfo,
    seat_info: concert.seatInfo,
    merch: concert.merch || [],
    companions: concert.companions || [],
    schedule: concert.schedule || [],
    memorable_moments: concert.memorableMoments || [],
    external_videos: concert.externalVideos || [],
    cover_media_id: concert.coverMediaId || null,
    updated_at: new Date().toISOString(),
  };
}

function fromDbConcert(row) {
  return {
    id: row.id,
    title: row.title || "",
    project: row.project || "",
    projects: row.projects || [],
    date: row.date || "",
    city: row.city || "",
    venue: row.venue || "",
    address: row.address || "",
    themeColor: row.theme_color || "#ff6f9f",
    tags: row.tags || [],
    note: row.note || "",
    thoughts: row.thoughts || "",
    favoriteSong: row.favorite_song || "",
    setlist: row.setlist || [],
    ticketInfo: row.ticket_info || "",
    seatInfo: row.seat_info || "",
    merch: row.merch || [],
    companions: row.companions || [],
    schedule: row.schedule || [],
    memorableMoments: row.memorable_moments || [],
    externalVideos: row.external_videos || [],
    coverMediaId: row.cover_media_id || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromDbMedia(row, signedUrl = "") {
  return {
    id: row.id,
    concertId: row.concert_id,
    type: row.type,
    fileName: row.file_name || "",
    caption: row.caption || "",
    storagePath: row.storage_path || "",
    mimeType: row.mime_type || "",
    sizeBytes: row.size_bytes || 0,
    url: signedUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllConcertsCloud() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("concerts").select("*").order("date", { ascending: false });
  if (error) throw error;
  return data.map(fromDbConcert);
}

export async function getConcertCloud(id) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("concerts").select("*").eq("id", id).single();
  if (error) throw error;
  return fromDbConcert(data);
}

export async function saveConcertCloud(concert) {
  const supabase = getSupabaseClient();
  const payload = toDbConcert(concert);

  if (concert.id) {
    const { data, error } = await supabase.from("concerts").update(payload).eq("id", concert.id).select().single();
    if (error) throw error;
    return fromDbConcert(data);
  }

  const { data, error } = await supabase.from("concerts").insert(payload).select().single();
  if (error) throw error;
  return fromDbConcert(data);
}

export async function deleteConcertCloud(id) {
  const media = await getMediaByConcertCloud(id);
  await Promise.all(media.map((item) => deleteMediaCloud(item.id)));
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("concerts").delete().eq("id", id);
  if (error) throw error;
}

async function signMediaRows(rows) {
  const supabase = getSupabaseClient();
  return Promise.all(
    rows.map(async (row) => {
      let signedUrl = "";
      if (row.storage_path) {
        const { data } = await supabase.storage.from(SUPABASE_CONFIG.mediaBucket).createSignedUrl(row.storage_path, 60 * 60);
        signedUrl = data?.signedUrl || "";
      }
      return fromDbMedia(row, signedUrl);
    }),
  );
}

export async function getMediaByConcertCloud(concertId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("media").select("*").eq("concert_id", concertId).order("created_at");
  if (error) throw error;
  return signMediaRows(data);
}

export async function getAllMediaCloud() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("media").select("*").order("created_at");
  if (error) throw error;
  return signMediaRows(data);
}

export async function getMediaCloud(id) {
  if (!id) return undefined;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("media").select("*").eq("id", id).single();
  if (error) return undefined;
  return (await signMediaRows([data]))[0];
}

export async function uploadImageCloud(concertId, file) {
  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user.id;
  const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
  const path = `${userId}/${concertId}/${crypto.randomUUID()}-${safeName || `image.${ext}`}`;

  const { error: uploadError } = await supabase.storage.from(SUPABASE_CONFIG.mediaBucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("media")
    .insert({
      concert_id: concertId,
      type: "image",
      file_name: file.name,
      caption: file.name.replace(/\.[^.]+$/, ""),
      storage_path: path,
      mime_type: file.type || "image/jpeg",
      size_bytes: file.size,
    })
    .select()
    .single();
  if (error) throw error;
  return (await signMediaRows([data]))[0];
}

export async function updateMediaCaptionCloud(id, caption) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("media").update({ caption, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteMediaCloud(id) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("media").select("storage_path").eq("id", id).single();
  if (error) throw error;
  if (data?.storage_path) {
    await supabase.storage.from(SUPABASE_CONFIG.mediaBucket).remove([data.storage_path]);
  }
  const { error: deleteError } = await supabase.from("media").delete().eq("id", id);
  if (deleteError) throw deleteError;
}
