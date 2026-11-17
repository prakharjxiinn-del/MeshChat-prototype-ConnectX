import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Bluetooth,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Compass,
  Ellipsis,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Radio,
  Search,
  Send,
  Settings,
  Signal,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MeshChat · Nearby, naturally" },
      {
        name: "description",
        content: "A local-first messenger prototype for nearby conversations without internet.",
      },
      { property: "og:title", content: "MeshChat · Nearby, naturally" },
      {
        property: "og:description",
        content: "A local-first messenger prototype for nearby conversations without internet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MeshChatApp,
});

type Message = {
  id: number;
  text: string;
  time: string;
  outgoing: boolean;
  status?: "sent" | "delivered";
};

type Chat = {
  id: string;
  name: string;
  initials: string;
  color: string;
  preview: string;
  time: string;
  online: boolean;
  unread?: number;
  messages: Message[];
};

const starterChats: Chat[] = [
  {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    color: "avatar-coral",
    preview: "Found a quiet spot by the fountain.",
    time: "2m",
    online: true,
    messages: [
      { id: 1, text: "Hey! Are you around campus?", time: "10:41", outgoing: false },
      { id: 2, text: "Just got here, near the library.", time: "10:42", outgoing: true, status: "delivered" },
      { id: 3, text: "Perfect, walking over now 🌿", time: "10:43", outgoing: false },
      { id: 4, text: "Found a quiet spot by the fountain.", time: "10:44", outgoing: false },
    ],
  },
  {
    id: "leo",
    name: "Leo Park",
    initials: "LP",
    color: "avatar-amber",
    preview: "That sounds good, see you there",
    time: "18m",
    online: true,
    messages: [
      { id: 1, text: "Coffee after class?", time: "10:20", outgoing: false },
      { id: 2, text: "That sounds good, see you there", time: "10:22", outgoing: true, status: "delivered" },
    ],
  },
  {
    id: "group",
    name: "Studio friends",
    initials: "SF",
    color: "avatar-mint",
    preview: "Nina: bringing the sketchbooks",
    time: "1h",
    online: true,
    unread: 2,
    messages: [
      { id: 1, text: "Meet in the courtyard?", time: "09:31", outgoing: false },
      { id: 2, text: "Nina: bringing the sketchbooks", time: "09:38", outgoing: false },
    ],
  },
  {
    id: "sam",
    name: "Sam Rivera",
    initials: "SR",
    color: "avatar-lilac",
    preview: "Message is on its way",
    time: "3h",
    online: false,
    messages: [
      { id: 1, text: "The west path is closed today.", time: "08:14", outgoing: false },
      { id: 2, text: "Thanks for the heads-up!", time: "08:17", outgoing: true, status: "delivered" },
    ],
  },
];

const initialPeers = [
  { id: "maya", name: "Maya Chen", initials: "MC", color: "avatar-coral", status: "Connected", strength: 4 },
  { id: "leo", name: "Leo Park", initials: "LP", color: "avatar-amber", status: "Connected", strength: 3 },
  { id: "nina", name: "Nina Patel", initials: "NP", color: "avatar-mint", status: "Nearby", strength: 3 },
  { id: "aria", name: "Aria James", initials: "AJ", color: "avatar-lilac", status: "Nearby", strength: 2 },
];

type View = "chats" | "nearby" | "settings";

function MeshChatApp() {
  const [chats, setChats] = useState(starterChats);
  const [selectedId, setSelectedId] = useState("maya");
  const [activeView, setActiveView] = useState<View>("chats");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [scanning, setScanning] = useState(false);
  const [nickname, setNickname] = useState("Prakhar");
  const [savedName, setSavedName] = useState("Prakhar");
  const [bluetoothOn, setBluetoothOn] = useState(true);
  const [peers, setPeers] = useState(initialPeers);

  const selectedChat = chats.find((chat) => chat.id === selectedId) ?? chats[0];
  const filteredChats = useMemo(
    () => chats.filter((chat) => chat.name.toLowerCase().includes(search.toLowerCase())),
    [chats, search],
  );
  const filteredPeers = useMemo(
    () => peers.filter((peer) => peer.name.toLowerCase().includes(search.toLowerCase())),
    [peers, search],
  );

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selectedChat) return;
    const now = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    setChats((current) =>
      current.map((chat) =>
        chat.id === selectedId
          ? {
              ...chat,
              preview: text,
              time: "now",
              messages: [...chat.messages, { id: Date.now(), text, time: now, outgoing: true, status: "sent" }],
            }
          : chat,
      ),
    );
    setDraft("");
  }

  function startScan() {
    setScanning(true);
    window.setTimeout(() => setScanning(false), 1800);
  }

  function connectPeer(peerId: string) {
    const peer = peers.find((item) => item.id === peerId);
    if (!peer) return;
    if (peer.status === "Connected") {
      const linkedChat = chats.find((chat) => chat.id === peerId);
      if (linkedChat) {
        setSelectedId(linkedChat.id);
        setActiveView("chats");
      }
      return;
    }
    setPeers((current) => current.map((item) => item.id === peerId ? { ...item, status: "Connected" } : item));
    setChats((current) => {
      if (current.some((chat) => chat.id === peerId)) return current;
      const newPeer = peers.find((item) => item.id === peerId);
      if (!newPeer) return current;
      return [{
        id: newPeer.id,
        name: newPeer.name,
        initials: newPeer.initials,
        color: newPeer.color,
        preview: "You’re connected. Say hello!",
        time: "now",
        online: true,
        messages: [],
      }, ...current];
    });
    setSelectedId(peerId);
    setActiveView("chats");
  }

  function switchView(view: View) {
    setActiveView(view);
    setSearch("");
  }

  return (
    <main className="mesh-shell min-h-screen p-3 sm:p-5 lg:p-8">
      <div className="mx-auto grid min-h-[min(900px,calc(100vh-4rem))] max-w-[1480px] grid-cols-1 overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/70 shadow-2xl shadow-primary/10 lg:grid-cols-[76px_310px_minmax(400px,1fr)_288px]">
        <aside className="mesh-nav hidden flex-col items-center justify-between py-6 lg:flex" aria-label="Primary navigation">
          <div className="flex flex-col items-center gap-10">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-background/15">
              <MessageCircle size={22} strokeWidth={2.4} />
            </div>
            <nav className="flex flex-col gap-4">
              <NavButton label="Chats" active={activeView === "chats"} onClick={() => switchView("chats")}>
                <MessageCircle />
              </NavButton>
              <NavButton label="Nearby" active={activeView === "nearby"} onClick={() => switchView("nearby")}>
                <Compass />
              </NavButton>
              <NavButton label="Settings" active={activeView === "settings"} onClick={() => switchView("settings")}>
                <Settings />
              </NavButton>
            </nav>
          </div>
          <button type="button" className="nav-icon" aria-label="Help"><CircleHelp size={19} /></button>
        </aside>

        <section className="flex min-h-[740px] flex-col border-border/70 bg-card/45 lg:min-h-0 lg:border-r" aria-label={activeView === "chats" ? "Chats" : activeView === "nearby" ? "Nearby devices" : "Settings"}>
          <header className="px-5 pb-4 pt-6 sm:px-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5 lg:hidden">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><MessageCircle size={19} /></div>
                <span className="font-display text-lg font-extrabold tracking-normal text-foreground">meshchat</span>
              </div>
              <div className="hidden lg:block">
                <p className="font-display text-xl font-extrabold text-foreground">{activeView === "chats" ? "Messages" : activeView === "nearby" ? "Discover" : "Settings"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{activeView === "chats" ? "Your little corner of the mesh" : activeView === "nearby" ? "People around you" : "Your local profile"}</p>
              </div>
              <Button variant="ghost" size="icon" className="size-9 rounded-xl text-muted-foreground" aria-label="More options"><MoreHorizontal size={20} /></Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={activeView === "nearby" ? "Search nearby people" : "Search chats"}
                placeholder={activeView === "nearby" ? "Find someone nearby" : "Search chats"}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="clay-inset h-10 rounded-xl border-0 pl-9 text-sm shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring"
              />
              <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">⌘ K</kbd>
            </div>
          </header>

          {activeView === "chats" && (
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              <div className="mb-2 flex items-center justify-between px-3 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Recent</p>
                <Button variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground" aria-label="Start a new chat" onClick={() => switchView("nearby")}><Plus size={16} /></Button>
              </div>
              <div className="space-y-1">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => setSelectedId(chat.id)}
                    aria-current={chat.id === selectedId ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${chat.id === selectedId ? "bg-secondary shadow-sm" : "hover:bg-secondary/65"}`}
                  >
                    <Avatar initials={chat.initials} color={chat.color} online={chat.online} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{chat.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{chat.time}</span>
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted-foreground">{chat.preview}</span>
                        {chat.unread ? <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{chat.unread}</span> : null}
                      </span>
                    </span>
                  </button>
                ))}
                {filteredChats.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No chats found</p>}
              </div>
              <div className="mb-2 mt-7 flex items-center justify-between px-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">On your mesh</p>
                <span className="text-[11px] font-medium text-primary">{peers.filter((peer) => peer.status === "Connected").length} connected</span>
              </div>
              <div className="clay-panel rounded-2xl p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Activity size={17} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">A little mesh is forming</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{peers.filter((peer) => peer.status === "Connected").length} nearby connections</p>
                  </div>
                  <span className="online-dot size-2 rounded-full" />
                </div>
              </div>
            </div>
          )}

          {activeView === "nearby" && (
            <div className="flex-1 overflow-y-auto px-3 pb-5">
              <div className="clay-panel mb-4 rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">Nearby people</p>
                    <p className="mt-1 text-xs text-muted-foreground">Only visible to devices close by</p>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Radio size={18} /></div>
                </div>
                <Button onClick={startScan} className="h-10 w-full rounded-xl shadow-md shadow-primary/20">
                  <Bluetooth className={scanning ? "animate-pulse" : ""} size={16} />
                  {scanning ? "Looking around…" : "Scan nearby"}
                </Button>
              </div>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Available nearby <span className="ml-1 font-medium normal-case tracking-normal">{filteredPeers.length}</span></p>
              <div className="space-y-1">
                {filteredPeers.map((peer) => (
                  <div key={peer.id} className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-secondary/65">
                    <Avatar initials={peer.initials} color={peer.color} online={peer.status === "Connected"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{peer.name}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Signal size={12} /> {peer.status} <span className="opacity-60">·</span> {peer.strength} bars
                      </div>
                    </div>
                    <Button size="sm" variant={peer.status === "Connected" ? "secondary" : "outline"} className="h-8 rounded-lg px-3 text-xs" onClick={() => connectPeer(peer.id)}>
                      {peer.status === "Connected" ? "Message" : "Connect"}
                    </Button>
                  </div>
                ))}
                {filteredPeers.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No nearby people found</p>}
              </div>
              <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-3 text-center text-xs leading-5 text-muted-foreground">
                Keep MeshChat open to stay discoverable to people around you.
              </div>
            </div>
          )}

          {activeView === "settings" && (
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              <div className="mb-5 flex items-center gap-3 rounded-2xl bg-secondary/60 p-4">
                <Avatar initials={savedName.slice(0, 2).toUpperCase()} color="avatar-blue" online />
                <div><p className="text-sm font-semibold text-foreground">{savedName}</p><p className="mt-1 text-xs text-muted-foreground">Just you, on this device</p></div>
              </div>
              <label htmlFor="nickname" className="mb-2 block text-xs font-semibold text-foreground">Your nickname</label>
              <div className="flex gap-2">
                <Input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} className="h-10 rounded-xl bg-background" />
                <Button variant="secondary" className="h-10 rounded-xl px-3" onClick={() => setSavedName(nickname.trim() || "Prakhar")}>Save</Button>
              </div>
              <p className="mb-7 mt-2 text-xs text-muted-foreground">Your nickname stays on this device.</p>
              <div className="divide-y divide-border/70 rounded-xl border border-border/70">
                <div className="flex items-center gap-3 p-4">
                  <Bluetooth size={17} className="text-primary" />
                  <div className="flex-1"><p className="text-sm font-semibold text-foreground">Bluetooth</p><p className="mt-0.5 text-xs text-muted-foreground">Nearby connections</p></div>
                  <button type="button" aria-label="Toggle Bluetooth" aria-pressed={bluetoothOn} onClick={() => setBluetoothOn(!bluetoothOn)} className={`relative h-6 w-11 rounded-full transition-colors ${bluetoothOn ? "bg-primary" : "bg-muted-foreground/35"}`}><span className={`absolute top-1 size-4 rounded-full bg-primary-foreground shadow-sm transition-transform ${bluetoothOn ? "left-6" : "left-1"}`} /></button>
                </div>
                <div className="flex items-center gap-3 p-4"><LockKeyhole size={17} className="text-primary" /><div><p className="text-sm font-semibold text-foreground">Privacy</p><p className="mt-0.5 text-xs text-muted-foreground">Messages stay on this device</p></div><ChevronDown className="ml-auto size-4 text-muted-foreground" /></div>
                <div className="flex items-center gap-3 p-4"><SlidersHorizontal size={17} className="text-primary" /><div><p className="text-sm font-semibold text-foreground">About MeshChat</p><p className="mt-0.5 text-xs text-muted-foreground">A small world, close by</p></div><ChevronDown className="ml-auto size-4 text-muted-foreground" /></div>
              </div>
              <div className="mt-5 rounded-xl bg-accent/70 p-4 text-xs leading-5 text-accent-foreground">
                <div className="mb-1.5 flex items-center gap-2 font-semibold"><Sparkles size={14} /> Local by nature</div>
                Your conversations live here. MeshChat doesn’t need a cloud account or phone number.
              </div>
              <Button variant="ghost" className="mt-6 w-full rounded-xl text-destructive hover:text-destructive" onClick={() => {
                setChats(starterChats);
                setSelectedId("maya");
              }}>Clear chat history</Button>
            </div>
          )}

          <nav className="grid grid-cols-3 border-t border-border/70 px-2 py-2 lg:hidden" aria-label="Mobile navigation">
            <MobileNavButton label="Chats" active={activeView === "chats"} onClick={() => switchView("chats")}><MessageCircle /></MobileNavButton>
            <MobileNavButton label="Nearby" active={activeView === "nearby"} onClick={() => switchView("nearby")}><Compass /></MobileNavButton>
            <MobileNavButton label="Settings" active={activeView === "settings"} onClick={() => switchView("settings")}><Settings /></MobileNavButton>
          </nav>
        </section>

        <section className={`${activeView !== "chats" ? "hidden lg:flex" : "flex"} min-h-[660px] flex-col bg-background/55`} aria-label="Conversation">
          <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-border/70 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="ghost" size="icon" className="-ml-2 size-9 shrink-0 rounded-xl text-muted-foreground lg:hidden" aria-label="Back to chats" onClick={() => switchView("chats")}><ArrowLeft size={18} /></Button>
              <Avatar initials={selectedChat?.initials ?? "MC"} color={selectedChat?.color ?? "avatar-coral"} online={selectedChat?.online ?? true} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{selectedChat?.name ?? "Maya Chen"}</p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="online-dot size-1.5 rounded-full" />
                  {selectedChat?.online ? "On your mesh" : "Last seen a little while ago"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="hidden items-center gap-1.5 rounded-full bg-accent/70 px-3 py-1.5 text-[11px] font-medium text-accent-foreground sm:flex"><LockKeyhole size={12} /> Local & private</div>
              <Button variant="ghost" size="icon" className="size-9 rounded-xl text-muted-foreground" aria-label="Conversation options"><Ellipsis size={19} /></Button>
            </div>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-7" aria-live="polite">
            <div className="flex justify-center"><span className="rounded-full bg-secondary/70 px-3 py-1 text-[10px] font-medium text-muted-foreground">Today · messages travel nearby</span></div>
            {(selectedChat?.messages ?? []).map((message) => (
              <div key={message.id} className={`mesh-enter flex ${message.outgoing ? "justify-end" : "justify-start"}`}>
                {!message.outgoing && <Avatar initials={selectedChat?.initials ?? "MC"} color={selectedChat?.color ?? "avatar-coral"} className="mr-2 mt-auto size-7 text-[9px]" />}
                <div className={`max-w-[82%] sm:max-w-[68%] ${message.outgoing ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={message.outgoing ? "message-outgoing rounded-2xl rounded-br-md px-4 py-3 text-sm leading-6 text-primary-foreground" : "clay-panel rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-6 text-foreground"}>{message.text}</div>
                  <div className={`mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground ${message.outgoing ? "mr-1" : "ml-1"}`}>
                    {message.time}
                    {message.outgoing && message.status === "delivered" ? <CheckCheck size={12} className="text-primary" /> : null}
                    {message.outgoing && message.status === "sent" ? <Check size={12} /> : null}
                  </div>
                </div>
              </div>
            ))}
            {selectedChat?.messages.length === 0 && (
              <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-accent/80 text-accent-foreground"><MessageCircle size={24} /></div>
                <p className="font-display text-base font-bold text-foreground">A new connection</p>
                <p className="mt-1 text-sm text-muted-foreground">Send a little hello to {selectedChat.name.split(" ")[0]}.</p>
              </div>
            )}
          </div>

          <div className="shrink-0 px-4 pb-4 sm:px-6 sm:pb-6">
            <form onSubmit={sendMessage} className="clay-panel flex items-end gap-2 rounded-2xl p-2">
              <Input
                aria-label="Type a message"
                placeholder="Write a message…"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="min-h-10 flex-1 border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0"
              />
              <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send message" className="size-10 shrink-0 rounded-xl shadow-md shadow-primary/20"><Send size={16} /></Button>
            </form>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground"><LockKeyhole size={10} /> Messages stay close. No internet needed.</p>
          </div>
        </section>

        <aside className="mesh-nav hidden flex-col px-5 py-6 text-sidebar-foreground xl:flex" aria-label="Mesh overview">
          <div className="mb-9 flex items-center gap-2.5 px-1">
            <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><MessageCircle size={19} strokeWidth={2.5} /></div>
            <div><p className="font-display text-base font-extrabold tracking-normal">meshchat</p><p className="text-[10px] text-sidebar-foreground/65">nearby, naturally</p></div>
          </div>
          <div className="mb-7 rounded-2xl border border-sidebar-foreground/10 bg-sidebar-foreground/[0.06] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-sidebar-foreground/75">YOUR MESH</span>
              <span className="online-dot size-2 rounded-full" />
            </div>
            <div className="flex items-end gap-2">
              <span className="font-display text-3xl font-extrabold">{peers.filter((peer) => peer.status === "Connected").length}</span>
              <span className="pb-1 text-xs text-sidebar-foreground/65">nearby connections</span>
            </div>
            <div className="mt-4 flex h-12 items-center justify-center gap-5 rounded-xl bg-sidebar-foreground/[0.05]">
              <span className="mesh-node"><span /></span><span className="mesh-link" /><span className="mesh-node"><span /></span><span className="mesh-link" /><span className="mesh-node"><span /></span>
            </div>
            <p className="mt-2 text-center text-[10px] text-sidebar-foreground/55">All messages stay in range</p>
          </div>

          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/60">Nearby</p>
            <button type="button" aria-label="View nearby people" className="rounded-lg p-1 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground" onClick={() => switchView("nearby")}><ArrowUpRight size={15} /></button>
          </div>
          <div className="space-y-1">
            {peers.slice(0, 4).map((peer) => (
              <button key={peer.id} type="button" onClick={() => connectPeer(peer.id)} className="flex w-full items-center gap-2.5 rounded-xl px-1.5 py-2 text-left transition-colors hover:bg-sidebar-foreground/[0.07]">
                <Avatar initials={peer.initials} color={peer.color} online={peer.status === "Connected"} className="size-8 text-[10px]" />
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{peer.name}</span><span className="mt-0.5 block text-[10px] text-sidebar-foreground/55">{peer.status}</span></span>
                <Signal size={14} className="shrink-0 text-sidebar-foreground/50" />
              </button>
            ))}
          </div>
          <Button variant="outline" className="mt-4 h-9 rounded-xl border-sidebar-foreground/15 bg-sidebar-foreground/[0.05] text-xs text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground" onClick={() => switchView("nearby")}><Compass size={14} /> Find people nearby</Button>

          <div className="mt-auto border-t border-sidebar-foreground/10 pt-5">
            <div className="mb-4 flex items-center gap-2.5 rounded-xl px-1 py-1">
              <Avatar initials={savedName.slice(0, 2).toUpperCase()} color="avatar-blue" className="size-9" />
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{savedName}</span><span className="mt-0.5 block text-[10px] text-sidebar-foreground/55">This device</span></span>
              <button type="button" aria-label="Open settings" className="rounded-lg p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-foreground/10" onClick={() => switchView("settings")}><Settings size={16} /></button>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-sidebar-foreground/[0.05] px-3 py-2.5">
              <span className="flex items-center gap-2 text-[11px] text-sidebar-foreground/75"><Bluetooth size={14} /> Bluetooth</span>
              <span className="flex items-center gap-1.5 text-[10px] font-medium">{bluetoothOn ? <><span className="online-dot size-1.5 rounded-full" /> On</> : <><X size={11} /> Off</>}</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-sidebar-foreground/45"><Wifi size={11} /> Works without Wi-Fi or mobile data</div>
          </div>
        </aside>
      </div>
      <p className="mx-auto mt-4 max-w-[1480px] text-center text-[10px] text-muted-foreground/80">Prototype preview · Nearby devices are simulated</p>
    </main>
  );
}

function Avatar({
  initials,
  color,
  online = false,
  className = "",
}: {
  initials: string;
  color: string;
  online?: boolean;
  className?: string;
}) {
  return (
    <span className={`relative flex size-10 shrink-0 items-center justify-center rounded-[14px] text-xs font-bold ${color} ${className}`}>
      {initials}
      {online ? <span className="online-dot absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card" /> : null}
    </span>
  );
}

function NavButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button variant="ghost" size="icon" aria-label={label} aria-current={active ? "page" : undefined} onClick={onClick} className={`nav-icon ${active ? "nav-icon-active" : ""}`}>
      {children}
    </Button>
  );
}

function MobileNavButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button variant="ghost" onClick={onClick} aria-current={active ? "page" : undefined} className={`flex h-14 flex-col gap-1 rounded-xl text-[10px] ${active ? "font-semibold text-primary" : "text-muted-foreground"}`}>
      {children}<span>{label}</span>
    </Button>
  );
}