import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Bluetooth,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Compass,
  FileJson,
  Gauge,
  Hash,
  ImagePlus,
  LockKeyhole,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Signal,
  Sparkles,
  Trash2,
  Users,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isHopLimitValid,
  tracePacketPath,
} from "@/lib/mesh-simulation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MeshChat · Offline Bluetooth Messenger" },
      {
        name: "description",
        content:
          "A local-first messenger prototype with simulated nearby discovery and mesh messaging.",
      },
      { property: "og:title", content: "MeshChat · Offline Bluetooth Messenger" },
      {
        property: "og:description",
        content:
          "A local-first messenger prototype with simulated nearby discovery and mesh messaging.",
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
  status?: "sent" | "delivered" | "read";
  reaction?: string;
  attachment?: string;
};

type Chat = {
  id: string;
  name: string;
  initials: string;
  color: string;
  preview: string;
  time: string;
  online: boolean;
  group?: boolean;
  unread?: number;
  members?: number;
  messages: Message[];
};

type Peer = {
  id: string;
  name: string;
  initials: string;
  color: string;
  status: "Connected" | "Nearby" | "Reconnecting";
  strength: number;
};

type View = "chats" | "nearby" | "groups" | "settings";

const starterChats: Chat[] = [
  {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    color: "avatar-coral",
    preview: "I found a quiet spot by the fountain.",
    time: "2m",
    online: true,
    messages: [
      { id: 1, text: "Hey! Are you around campus?", time: "10:41", outgoing: false },
      {
        id: 2,
        text: "Just got here, near the library.",
        time: "10:42",
        outgoing: true,
        status: "read",
      },
      { id: 3, text: "Perfect, walking over now 🌿", time: "10:43", outgoing: false },
      { id: 4, text: "I found a quiet spot by the fountain.", time: "10:44", outgoing: false },
    ],
  },
  {
    id: "leo",
    name: "Leo Park",
    initials: "LP",
    color: "avatar-amber",
    preview: "Coffee after class?",
    time: "18m",
    online: true,
    messages: [
      { id: 1, text: "Coffee after class?", time: "10:20", outgoing: false },
      {
        id: 2,
        text: "That sounds good, see you there.",
        time: "10:22",
        outgoing: true,
        status: "delivered",
      },
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
    group: true,
    unread: 2,
    members: 4,
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
    preview: "Thanks for the heads-up!",
    time: "3h",
    online: false,
    messages: [
      { id: 1, text: "The west path is closed today.", time: "08:14", outgoing: false },
      {
        id: 2,
        text: "Thanks for the heads-up!",
        time: "08:17",
        outgoing: true,
        status: "delivered",
      },
    ],
  },
];

const initialPeers: Peer[] = [
  { id: "maya", name: "Maya Chen", initials: "MC", color: "avatar-coral", status: "Connected", strength: 4 },
  { id: "leo", name: "Leo Park", initials: "LP", color: "avatar-amber", status: "Connected", strength: 3 },
  { id: "nina", name: "Nina Patel", initials: "NP", color: "avatar-mint", status: "Nearby", strength: 3 },
  { id: "aria", name: "Aria James", initials: "AJ", color: "avatar-lilac", status: "Nearby", strength: 2 },
];

function MeshChatApp() {
  const [chats, setChats] = useState(starterChats);
  const [selectedId, setSelectedId] = useState("maya");
  const [activeView, setActiveView] = useState<View>("chats");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [scanning, setScanning] = useState(false);
  const [nickname, setNickname] = useState("Prakhar");
  const [savedName, setSavedName] = useState("Prakhar");
  const [bluetoothOn, setBluetoothOn] = useState(true);
  const [peers, setPeers] = useState(initialPeers);
  const [hopLimit, setHopLimit] = useState(3);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(true);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [fileName, setFileName] = useState("");
  const attachmentInput = useRef<HTMLInputElement>(null);

  const selectedChat = chats.find((chat) => chat.id === selectedId) ?? chats[0];
  const connectedPeers = peers.filter((peer) => peer.status === "Connected");
  const relayPeerIds = peers
    .filter((peer) => peer.id !== selectedId && peer.status === "Connected")
    .map((peer) => peer.id);
  const packetTrace = tracePacketPath(hopLimit, relayPeerIds);
  const filteredChats = useMemo(
    () =>
      chats.filter(
        (chat) =>
          chat.name.toLowerCase().includes(query.toLowerCase()) ||
          chat.preview.toLowerCase().includes(query.toLowerCase()),
      ),
    [chats, query],
  );
  const visibleMessages = useMemo(
    () =>
      (selectedChat?.messages ?? []).filter((message) =>
        message.text.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, selectedChat],
  );

  useEffect(() => {
    if (!scanning) return;
    const timer = window.setTimeout(() => setScanning(false), 3400);
    return () => window.clearTimeout(timer);
  }, [scanning]);

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text && !fileName) return;
    const now = new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    const message: Message = {
      id: Date.now(),
      text,
      time: now,
      outgoing: true,
      status: "sent",
      attachment: fileName || undefined,
    };
    setChats((current) =>
      current.map((chat) =>
        chat.id === selectedId
          ? {
              ...chat,
              preview: fileName ? `Shared ${fileName}` : text,
              time: "now",
              messages: [...chat.messages, message],
            }
          : chat,
      ),
    );
    const messageId = message.id;
    window.setTimeout(() => {
      setChats((current) =>
        current.map((chat) =>
          chat.id === selectedId
            ? {
                ...chat,
                messages: chat.messages.map((item) =>
                  item.id === messageId ? { ...item, status: "delivered" } : item,
                ),
              }
            : chat,
        ),
      );
    }, 1200);
    setDraft("");
    setFileName("");
  }

  function connectPeer(peerId: string) {
    const peer = peers.find((item) => item.id === peerId);
    if (!peer) return;
    const connected = peer.status === "Connected";
    setPeers((current) =>
      current.map((item) =>
        item.id === peerId
          ? { ...item, status: connected ? "Nearby" : "Connected" }
          : item,
      ),
    );
    if (connected) return;

    setChats((current) => {
      if (current.some((chat) => chat.id === peerId)) return current;
      return [
        {
          id: peer.id,
          name: peer.name,
          initials: peer.initials,
          color: peer.color,
          preview: "You’re connected. Say hello!",
          time: "now",
          online: true,
          messages: [],
        },
        ...current,
      ];
    });
    setSelectedId(peerId);
    setActiveView("chats");
  }

  function setMessageReaction(messageId: number, reaction: string) {
    setChats((current) =>
      current.map((chat) =>
        chat.id === selectedId
          ? {
              ...chat,
              messages: chat.messages.map((message) =>
                message.id === messageId
                  ? { ...message, reaction: message.reaction === reaction ? undefined : reaction }
                  : message,
              ),
            }
          : chat,
      ),
    );
  }

  function deleteMessage(messageId: number) {
    setChats((current) =>
      current.map((chat) =>
        chat.id === selectedId
          ? { ...chat, messages: chat.messages.filter((message) => message.id !== messageId) }
          : chat,
      ),
    );
  }

  function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    const groupId = `group-${Date.now()}`;
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");
    setChats((current) => [
      {
        id: groupId,
        name,
        initials,
        color: "avatar-blue",
        preview: "Your group is ready. Say hello!",
        time: "now",
        online: true,
        group: true,
        members: connectedPeers.length + 1,
        messages: [],
      },
      ...current,
    ]);
    setSelectedId(groupId);
    setActiveView("chats");
    setGroupDialogOpen(false);
    setNewGroupName("");
  }

  function changeView(view: View) {
    setActiveView(view);
    setQuery("");
  }

  return (
    <main className="mesh-shell min-h-svh px-0 py-0 text-foreground sm:p-4 lg:p-6">
      <div className="mx-auto grid min-h-svh max-w-[1600px] overflow-hidden border-border bg-card/55 shadow-2xl shadow-background/70 sm:min-h-[min(880px,calc(100svh-2rem))] sm:rounded-[1.5rem] sm:border lg:min-h-[min(910px,calc(100svh-3rem))] lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_300px]">
        <aside className="mesh-nav hidden flex-col border-r border-sidebar-border px-5 py-6 lg:flex" aria-label="Primary navigation">
          <Brand />
          <div className="mt-9 flex items-center justify-between px-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/55">Workspace</span>
            <Button variant="ghost" size="icon" aria-label="Start a new group" title="New group" className="size-8 rounded-lg text-sidebar-foreground/65 hover:text-sidebar-foreground" onClick={() => setGroupDialogOpen(true)}><Plus size={17} /></Button>
          </div>
          <nav className="mt-2 space-y-1" aria-label="Main menu">
            <SidebarNavButton label="Chats" count={chats.filter((chat) => !chat.group).length} active={activeView === "chats"} onClick={() => changeView("chats")}><MessageCircle size={17} /></SidebarNavButton>
            <SidebarNavButton label="Nearby" count={peers.length} active={activeView === "nearby"} onClick={() => changeView("nearby")}><Compass size={17} /></SidebarNavButton>
            <SidebarNavButton label="Groups" count={chats.filter((chat) => chat.group).length} active={activeView === "groups"} onClick={() => changeView("groups")}><Users size={17} /></SidebarNavButton>
          </nav>
          <div className="mt-9 flex items-center justify-between px-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/55">Recent chats</span>
            <span className="text-[10px] text-sidebar-foreground/45">{chats.length.toString().padStart(2, "0")}</span>
          </div>
          <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
            {filteredChats.map((chat) => (
              <ChatListButton key={chat.id} chat={chat} active={chat.id === selectedId && activeView === "chats"} onClick={() => { setSelectedId(chat.id); setActiveView("chats"); }} />
            ))}
            {filteredChats.length === 0 ? <p className="px-3 py-5 text-xs text-sidebar-foreground/55">No conversations found.</p> : null}
          </div>
          <div className="mt-5 rounded-xl border border-sidebar-border bg-sidebar-foreground/[0.04] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-sidebar-foreground/65">Local mesh</span>
              <span className="online-dot size-2 rounded-full" />
            </div>
            <div className="mt-2 flex items-end gap-2"><span className="font-display text-2xl font-extrabold">{connectedPeers.length}</span><span className="pb-1 text-[11px] text-sidebar-foreground/60">peers in range</span></div>
            <MeshPath compact />
          </div>
          <div className="mt-4 border-t border-sidebar-border pt-4">
            <SidebarNavButton label="Settings" active={activeView === "settings"} onClick={() => changeView("settings")}><Settings size={17} /></SidebarNavButton>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-sidebar-foreground/[0.04] px-3 py-3">
              <Avatar initials={savedName.slice(0, 2).toUpperCase()} color="avatar-blue" />
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{savedName}</p><p className="mt-0.5 text-[10px] text-sidebar-foreground/55">This device</p></div>
              <span className="size-2 shrink-0 rounded-full bg-accent" />
            </div>
          </div>
        </aside>

        <div className="flex min-h-svh min-w-0 flex-col lg:min-h-0">
          <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-border/75 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden"><Brand compact /></div>
              <div className="hidden lg:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{getViewKicker(activeView)}</p>
                <h1 className="mt-0.5 font-display text-lg font-bold">{getViewTitle(activeView)}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeView === "chats" ? (
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input aria-label="Search chats and messages" placeholder="Search messages" value={query} onChange={(event) => setQuery(event.target.value)} className="clay-inset h-9 w-48 rounded-lg border-0 pl-9 text-xs shadow-none focus-visible:ring-1" />
                </div>
              ) : null}
              <div className="hidden items-center gap-2 rounded-lg border border-border/80 bg-secondary/50 px-2.5 py-1.5 sm:flex"><Bluetooth size={14} className={bluetoothOn ? "text-accent" : "text-muted-foreground"} /><span className="text-[11px] font-medium">{bluetoothOn ? "Ready" : "Paused"}</span></div>
              <Button variant="ghost" size="icon" aria-label="Open settings" className="size-9 rounded-lg text-muted-foreground" onClick={() => changeView("settings")}><Settings size={17} /></Button>
            </div>
          </header>

          {activeView === "chats" ? (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <aside className="flex shrink-0 flex-col border-b border-border/70 lg:w-[280px] lg:border-b-0 lg:border-r xl:w-[306px]" aria-label="Conversation list">
                <div className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-5 lg:pb-3">
                  <div><p className="font-display text-base font-bold lg:hidden">Messages</p><p className="mt-0.5 text-[11px] text-muted-foreground">{chats.length} conversations nearby</p></div>
                  <Button variant="outline" size="icon" aria-label="Create a group" title="Create a group" className="size-8 rounded-lg" onClick={() => setGroupDialogOpen(true)}><Plus size={16} /></Button>
                </div>
                <div className="relative px-4 pb-3 sm:px-5 lg:hidden">
                  <Search className="absolute left-7 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input aria-label="Search chats and messages" placeholder="Search conversations" value={query} onChange={(event) => setQuery(event.target.value)} className="clay-inset h-10 rounded-xl border-0 pl-9 text-xs shadow-none focus-visible:ring-1" />
                </div>
                <div className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
                  {filteredChats.map((chat) => <Button key={chat.id} variant={selectedId === chat.id ? "secondary" : "ghost"} className="h-9 shrink-0 gap-2 rounded-lg px-2.5 text-xs" onClick={() => setSelectedId(chat.id)}><Avatar initials={chat.initials} color={chat.color} className="size-6 rounded-md text-[9px]" />{chat.name.split(" ")[0]}</Button>)}
                </div>
                <div className="hidden flex-1 space-y-1 overflow-y-auto px-2 pb-3 lg:block">
                  {filteredChats.map((chat) => <ChatListButton key={chat.id} chat={chat} active={chat.id === selectedId} onClick={() => setSelectedId(chat.id)} />)}
                  {filteredChats.length === 0 ? <p className="px-3 py-8 text-center text-xs text-muted-foreground">No conversations found.</p> : null}
                </div>
                <div className="hidden border-t border-border/70 px-5 py-3 text-[10px] text-muted-foreground lg:block"><span className="inline-flex items-center gap-1.5"><span className="online-dot size-1.5 rounded-full" />{connectedPeers.length} peers on your mesh</span></div>
              </aside>

              <section className="flex min-h-[430px] min-w-0 flex-1 flex-col bg-background/55" aria-label="Conversation">
                <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-border/70 px-4 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar initials={selectedChat?.initials ?? "MC"} color={selectedChat?.color ?? "avatar-coral"} online={selectedChat?.online ?? false} />
                    <div className="min-w-0"><p className="truncate text-sm font-bold">{selectedChat?.name ?? "Choose a chat"}</p><p className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className={selectedChat?.online ? "online-dot size-1.5 rounded-full" : "size-1.5 rounded-full bg-muted-foreground/60"} />{selectedChat?.group ? `${selectedChat.members ?? 3} people in this group` : selectedChat?.online ? "Nearby · connected" : "Last seen a little while ago"}</p></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="hidden items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1.5 text-[10px] font-medium text-accent sm:flex"><LockKeyhole size={12} />Private</div>
                    <Button variant="ghost" size="icon" aria-label="Conversation options" className="size-8 rounded-lg text-muted-foreground"><MoreHorizontal size={18} /></Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-secondary/25 px-4 py-2.5 sm:px-6">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><LockKeyhole size={12} className="text-accent" />End-to-end privacy <span className="hidden text-muted-foreground/70 sm:inline">· relays can’t read your messages</span></div>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-md px-2 text-[10px] text-primary" onClick={() => setInspectorOpen(true)}><FileJson size={13} />Packet inspector</Button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6" aria-live="polite">
                  <div className="flex justify-center"><span className="rounded-full border border-border/70 bg-secondary/60 px-3 py-1.5 text-[9px] font-medium text-muted-foreground">Today · messages travel nearby</span></div>
                  {visibleMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} color={selectedChat?.color ?? "avatar-coral"} onReact={setMessageReaction} onDelete={deleteMessage} />
                  ))}
                  {visibleMessages.length === 0 ? (
                    <div className="flex min-h-44 flex-1 flex-col items-center justify-center text-center">
                      <div className="mb-3 grid size-12 place-items-center rounded-xl bg-secondary text-primary"><MessageCircle size={21} /></div>
                      <p className="text-sm font-semibold">{query ? "No matching messages" : "A new connection"}</p>
                      <p className="mt-1 max-w-64 text-xs leading-5 text-muted-foreground">{query ? "Try another name or phrase." : `Send a little hello to ${selectedChat?.name.split(" ")[0] ?? "your contact"}.`}</p>
                    </div>
                  ) : null}
                  <div className="mt-auto flex justify-center pt-2"><span className="inline-flex items-center gap-1.5 text-[9px] text-muted-foreground/75"><WifiOff size={11} />No internet connection required</span></div>
                </div>

                <div className="shrink-0 border-t border-border/70 p-3 sm:px-5 sm:py-4">
                  {fileName ? <div className="mb-2 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs"><ImagePlus size={14} className="text-primary" /><span className="min-w-0 flex-1 truncate">{fileName}</span><Button variant="ghost" size="icon" aria-label="Remove attachment" className="size-6" onClick={() => setFileName("")}><X size={13} /></Button></div> : null}
                  <form onSubmit={sendMessage} className="clay-panel flex items-center gap-1.5 rounded-xl p-1.5 sm:gap-2 sm:p-2">
                    <input ref={attachmentInput} type="file" aria-label="Choose an image or file" accept="image/*,.pdf,.txt,.zip" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
                    <Button type="button" variant="ghost" size="icon" aria-label="Attach a file" className="size-9 shrink-0 rounded-lg text-muted-foreground" onClick={() => attachmentInput.current?.click()}><Paperclip size={17} /></Button>
                    <Input aria-label="Type a message" placeholder="Write a message…" value={draft} onChange={(event) => setDraft(event.target.value)} className="h-10 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0" />
                    <Button type="submit" size="icon" disabled={!draft.trim() && !fileName} aria-label="Send message" className="size-9 shrink-0 rounded-lg shadow-md shadow-primary/20"><Send size={15} /></Button>
                  </form>
                  <p className="mt-2 hidden items-center justify-center gap-1.5 text-[9px] text-muted-foreground/75 sm:flex"><LockKeyhole size={10} />Messages stay on this device in this preview</p>
                </div>
              </section>
            </div>
          ) : null}

          {activeView === "nearby" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[minmax(260px,0.9fr)_minmax(300px,1.1fr)] lg:gap-7 lg:px-8 lg:py-7">
              <section className="flex flex-col items-center justify-center border-b border-border/70 pb-5 lg:border-b-0 lg:border-r lg:pb-0" aria-label="Nearby scanning">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">DISCOVER PEERS</p>
                <div className="radar-stage my-2">
                  <div className="radar-ring radar-ring-one" />
                  <div className="radar-ring radar-ring-two" />
                  <div className="radar-ring radar-ring-three" />
                  <div className="radar-core"><Bluetooth size={24} /></div>
                  {peers.slice(0, 4).map((peer, index) => <span key={peer.id} className={`radar-peer radar-peer-${index + 1} ${peer.status === "Connected" ? "radar-peer-connected" : ""}`} title={peer.name}><span /></span>)}
                  {scanning ? <span className="radar-sweep" /> : null}
                </div>
                <p className="font-display text-lg font-bold">{scanning ? "Scanning nearby…" : "Your nearby mesh"}</p>
                <p className="mt-1 max-w-64 text-center text-xs leading-5 text-muted-foreground">{scanning ? "Listening for simulated peers in range." : "Discover people close by, even without internet."}</p>
                <Button onClick={() => { setScanning(true); setBluetoothOn(true); }} className="mt-4 h-10 gap-2 rounded-lg px-5"><Radio size={15} className={scanning ? "animate-pulse" : ""} />{scanning ? "Scanning" : "Scan nearby"}</Button>
                <div className="mt-4 flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1.5 text-[10px] text-muted-foreground"><MapPin size={12} />Nearby demo · Bluetooth is simulated</div>
              </section>
              <section className="pt-5 lg:py-2" aria-label="Nearby people">
                <div className="mb-3 flex items-center justify-between"><div><h2 className="font-display text-base font-bold">People around you</h2><p className="mt-1 text-[11px] text-muted-foreground">{connectedPeers.length} connected · {peers.length - connectedPeers.length} within range</p></div><Button variant="ghost" size="icon" aria-label="Refresh nearby people" className="size-8 rounded-lg text-muted-foreground" onClick={() => setScanning(true)}><RefreshCw size={15} /></Button></div>
                <div className="divide-y divide-border/70 border-y border-border/70">
                  {peers.filter((peer) => peer.name.toLowerCase().includes(query.toLowerCase())).map((peer) => (
                    <div key={peer.id} className="flex items-center gap-3 py-3.5">
                      <Avatar initials={peer.initials} color={peer.color} online={peer.status === "Connected"} />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{peer.name}</p><p className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Signal size={11} />{peer.status}<span>·</span>{peer.strength}/4 signal</p></div>
                      <Button variant={peer.status === "Connected" ? "secondary" : "outline"} size="sm" className="h-8 rounded-lg px-3 text-[11px]" onClick={() => connectPeer(peer.id)}>{peer.status === "Connected" ? "Disconnect" : "Connect"}</Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2 rounded-lg border border-border/70 bg-secondary/25 p-3 text-[10px] leading-4 text-muted-foreground"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent" />Only nearby, connected peers can join your local mesh. No contact list is uploaded.</div>
              </section>
            </div>
          ) : null}

          {activeView === "groups" ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
              <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">GROUP MESH</p><h2 className="mt-1 font-display text-xl font-bold">Together, nearby</h2></div><Button className="h-9 gap-2 rounded-lg" onClick={() => setGroupDialogOpen(true)}><Plus size={15} />New group</Button></div>
              <div className="divide-y divide-border/70 border-y border-border/70">
                {chats.filter((chat) => chat.group).map((chat) => <ChatListButton key={chat.id} chat={chat} active={chat.id === selectedId} onClick={() => { setSelectedId(chat.id); setActiveView("chats"); }} />)}
              </div>
              {chats.every((chat) => !chat.group) ? <div className="py-14 text-center"><div className="mx-auto grid size-12 place-items-center rounded-xl bg-secondary text-primary"><Users size={20} /></div><p className="mt-3 text-sm font-semibold">No groups yet</p><p className="mt-1 text-xs text-muted-foreground">Start a group with people connected nearby.</p><Button variant="outline" className="mt-4 h-9 gap-2 rounded-lg" onClick={() => setGroupDialogOpen(true)}><Plus size={14} />Create your first group</Button></div> : null}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <StatStrip icon={<Users size={16} />} value={chats.filter((chat) => chat.group).length.toString()} label="Local groups" />
                <StatStrip icon={<Bluetooth size={16} />} value={connectedPeers.length.toString()} label="Peers in this mesh" />
              </div>
            </div>
          ) : null}

          {activeView === "settings" ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
              <div className="mx-auto max-w-2xl">
                <div className="mb-6 flex items-center gap-3"><Avatar initials={savedName.slice(0, 2).toUpperCase()} color="avatar-blue" className="size-12 text-sm" /><div><h2 className="font-display text-lg font-bold">Your profile</h2><p className="mt-1 text-xs text-muted-foreground">A local name for people nearby</p></div></div>
                <label htmlFor="nickname" className="mb-2 block text-xs font-semibold">Display name</label>
                <div className="flex gap-2"><Input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} className="h-10 rounded-lg bg-background" /><Button variant="secondary" className="h-10 rounded-lg px-4" onClick={() => setSavedName(nickname.trim() || "Prakhar")}>Save</Button></div>
                <p className="mb-6 mt-2 text-[10px] text-muted-foreground">Your profile is stored only in this preview.</p>
                <div className="divide-y divide-border/70 border-y border-border/70">
                  <SettingRow icon={<Bluetooth size={16} />} title="Bluetooth discovery" detail="Nearby device discovery is simulated" action={<Button variant={bluetoothOn ? "secondary" : "outline"} size="sm" className="h-8 rounded-lg px-3 text-[10px]" aria-pressed={bluetoothOn} onClick={() => setBluetoothOn(!bluetoothOn)}>{bluetoothOn ? "On" : "Off"}</Button>} />
                  <SettingRow icon={<ShieldCheck size={16} />} title="Privacy & security" detail="Messages remain local in this prototype" action={<span className="flex items-center gap-1 text-[10px] font-medium text-accent"><LockKeyhole size={12} />Private</span>} />
                  <SettingRow icon={<RefreshCw size={16} />} title="Reconnect nearby peers" detail="Reconnection behavior is shown in the simulation" action={<span className="size-2 rounded-full bg-accent" />} />
                  <SettingRow icon={<Sparkles size={16} />} title="About MeshChat" detail="A small world, close by" action={<ChevronRight size={15} className="text-muted-foreground" />} />
                </div>
                <div className="mt-5 rounded-lg border border-accent/15 bg-accent/5 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-accent"><ShieldCheck size={14} />Private by design</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">Your chats stay on this device. Security badges in this web demo are visual; real encryption and Bluetooth transmission need a native app.</p></div>
                <div className="mt-6 flex flex-wrap gap-2"><Button variant="outline" className="h-9 gap-2 rounded-lg text-xs" onClick={() => setOnboardingOpen(true)}><Sparkles size={14} />Replay welcome</Button><Button variant="destructive" className="h-9 gap-2 rounded-lg text-xs" onClick={() => { setChats(starterChats); setSelectedId("maya"); }}><Trash2 size={14} />Clear chat history</Button></div>
              </div>
            </div>
          ) : null}

          <MobileNavigation activeView={activeView} changeView={changeView} />
        </div>

        <aside className="mesh-nav hidden min-h-0 flex-col border-l border-sidebar-border px-5 py-6 text-sidebar-foreground xl:flex" aria-label="Mesh relay overview">
          <div className="mb-6 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/55">LIVE NETWORK</p><h2 className="mt-1 font-display text-base font-bold">Mesh overview</h2></div><span className="online-dot size-2 rounded-full" /></div>
          <div className="rounded-xl border border-sidebar-border bg-sidebar-foreground/[0.035] p-4">
            <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-sidebar-foreground/65">CONNECTED NODES</span><span className="flex items-center gap-1 text-[10px] text-accent"><Activity size={12} />Live</span></div>
            <p className="mt-2 font-display text-3xl font-extrabold">{connectedPeers.length + 1}<span className="ml-1 text-xs font-medium text-sidebar-foreground/55">devices</span></p>
            <MeshPath />
            <p className="mt-2 text-center text-[9px] text-sidebar-foreground/50">Local relay path · no internet</p>
          </div>

          <section className="mt-7" aria-label="Relay peers"><div className="mb-3 flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60">Relay peers</h3><Button variant="ghost" size="icon" aria-label="Find nearby peers" className="size-7 rounded-md text-sidebar-foreground/60" onClick={() => changeView("nearby")}><ArrowUpRight size={14} /></Button></div>
            <div className="space-y-1">{peers.slice(0, 4).map((peer) => <div key={peer.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-2"><Avatar initials={peer.initials} color={peer.color} online={peer.status === "Connected"} className="size-8 rounded-[10px] text-[10px]" /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium">{peer.name}</p><p className="mt-0.5 text-[9px] text-sidebar-foreground/50">{peer.status}</p></div><Signal size={13} className="shrink-0 text-sidebar-foreground/50" /></div>)}</div>
          </section>

          <section className="mt-7 border-t border-sidebar-border pt-5" aria-label="Packet routing controls">
            <div className="mb-3 flex items-center gap-2"><Gauge size={14} className="text-sidebar-primary" /><h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/70">Scenario controls</h3></div>
            <p className="text-[10px] text-sidebar-foreground/55">Maximum hops · TTL</p>
            <div className="mt-2 grid grid-cols-5 gap-1.5" role="group" aria-label="Maximum packet hops">
              {[1, 2, 3, 4, 5].map((limit) => <Button key={limit} variant={hopLimit === limit ? "default" : "outline"} size="sm" className="h-8 rounded-md border-sidebar-border px-0 text-[10px]" aria-pressed={hopLimit === limit} disabled={!isHopLimitValid(limit)} onClick={() => setHopLimit(limit)}>{limit}</Button>)}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-sidebar-foreground/[0.045] px-3 py-2.5"><span className="text-[10px] text-sidebar-foreground/65">Route status</span><span className={`text-[10px] font-semibold ${packetTrace.destinationReached ? "text-accent" : "text-sidebar-primary"}`}>{packetTrace.destinationReached ? "Destination reached" : "Hop limit reached"}</span></div>
            <Button variant="outline" className="mt-3 h-9 w-full gap-2 rounded-lg border-sidebar-border bg-sidebar-foreground/[0.035] text-[10px] text-sidebar-foreground hover:bg-sidebar-foreground/10" onClick={() => setInspectorOpen(true)}><FileJson size={14} />Inspect latest packet</Button>
          </section>

          <div className="mt-auto border-t border-sidebar-border pt-4"><div className="flex items-center justify-center gap-1.5 text-[9px] text-sidebar-foreground/45"><LockKeyhole size={11} />Private, local & close by</div></div>
        </aside>
      </div>

      <p className="mx-auto max-w-[1600px] py-2 text-center text-[9px] text-muted-foreground/65">MeshChat preview · nearby discovery and message delivery are simulated</p>

      {onboardingOpen ? <WelcomeDialog nickname={nickname} setNickname={setNickname} close={() => { setSavedName(nickname.trim() || "Prakhar"); setOnboardingOpen(false); }} /> : null}
      {inspectorOpen ? <PacketInspector hopLimit={hopLimit} trace={packetTrace} close={() => setInspectorOpen(false)} /> : null}
      {groupDialogOpen ? <GroupDialog value={newGroupName} setValue={setNewGroupName} close={() => setGroupDialogOpen(false)} onSubmit={createGroup} /> : null}
    </main>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`grid shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/15 ${compact ? "size-8" : "size-9"}`}><MessageCircle size={compact ? 16 : 18} strokeWidth={2.4} /></div>
      <div className={compact ? "" : "text-sidebar-foreground"}><p className={`font-display font-extrabold ${compact ? "text-sm" : "text-base"}`}>meshchat</p>{!compact ? <p className="mt-0.5 text-[9px] text-sidebar-foreground/55">offline, together</p> : null}</div>
    </div>
  );
}

function Avatar({ initials, color, online = false, className = "" }: { initials: string; color: string; online?: boolean; className?: string }) {
  return <span className={`relative grid size-10 shrink-0 place-items-center rounded-[13px] text-[11px] font-bold ${color} ${className}`}>{initials}{online ? <span className="online-dot absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card" /> : null}</span>;
}

function SidebarNavButton({ label, active, onClick, count, children }: { label: string; active: boolean; onClick: () => void; count?: number; children: React.ReactNode }) {
  return <Button variant="ghost" aria-current={active ? "page" : undefined} onClick={onClick} className={`h-10 w-full justify-start gap-3 rounded-lg px-3 text-xs font-medium ${active ? "bg-sidebar-primary/12 text-sidebar-primary hover:bg-sidebar-primary/15 hover:text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-foreground/[0.06] hover:text-sidebar-foreground"}`}>{children}<span className="flex-1 text-left">{label}</span>{count !== undefined ? <span className="text-[10px] text-sidebar-foreground/45">{count}</span> : null}</Button>;
}

function ChatListButton({ chat, active, onClick }: { chat: Chat; active: boolean; onClick: () => void }) {
  return <Button variant="ghost" aria-current={active ? "true" : undefined} onClick={onClick} className={`h-auto min-h-[62px] w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-left ${active ? "bg-secondary text-foreground" : "text-foreground hover:bg-secondary/60"}`}><Avatar initials={chat.initials} color={chat.color} online={chat.online} /><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold">{chat.name}</span><span className="shrink-0 text-[9px] text-muted-foreground">{chat.time}</span></span><span className="mt-1 flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1 truncate text-[10px] text-muted-foreground">{chat.group ? <Users size={10} className="shrink-0" /> : null}{chat.preview}</span>{chat.unread ? <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">{chat.unread}</span> : null}</span></span></Button>;
}

function MessageBubble({ message, color, onReact, onDelete }: { message: Message; color: string; onReact: (id: number, reaction: string) => void; onDelete: (id: number) => void }) {
  return <div className={`mesh-enter flex items-end gap-2 ${message.outgoing ? "justify-end" : "justify-start"}`}>
    {!message.outgoing ? <Avatar initials={color === "avatar-coral" ? "MC" : ""} color={color} className="size-7 rounded-[9px] text-[8px]" /> : null}
    <div className={`flex max-w-[84%] flex-col ${message.outgoing ? "items-end" : "items-start"}`}>
      <div className={message.outgoing ? "message-outgoing rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm leading-6 text-primary-foreground" : "clay-panel rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-6 text-foreground"}>
        {message.attachment ? <div className="mb-2 flex items-center gap-2 rounded-lg bg-background/15 px-2.5 py-2 text-[11px]"><Paperclip size={13} /><span className="max-w-48 truncate">{message.attachment}</span></div> : null}{message.text}
      </div>
      <div className={`mt-1 flex items-center gap-1.5 text-[9px] text-muted-foreground ${message.outgoing ? "mr-1" : "ml-1"}`}><span>{message.time}</span>{message.outgoing ? <DeliveryStatus status={message.status ?? "sent"} /> : null}{message.reaction ? <span className="rounded-full border border-border/70 bg-card px-1.5 py-0.5">{message.reaction}</span> : null}</div>
      <div className="mt-1 flex items-center gap-1">
        {message.reaction === "❤️" ? null : <Button type="button" variant="ghost" size="sm" className="h-5 rounded px-1.5 text-[9px] text-muted-foreground" aria-label="React with a heart" onClick={() => onReact(message.id, "❤️")}>♡</Button>}
        {message.reaction === "👍" ? null : <Button type="button" variant="ghost" size="sm" className="h-5 rounded px-1.5 text-[9px] text-muted-foreground" aria-label="React with a thumbs up" onClick={() => onReact(message.id, "👍")}>+1</Button>}
        {message.outgoing ? <Button type="button" variant="ghost" size="icon" className="size-5 rounded text-muted-foreground" aria-label="Delete message" onClick={() => onDelete(message.id)}><Trash2 size={11} /></Button> : null}
      </div>
    </div>
  </div>;
}

function DeliveryStatus({ status }: { status: "sent" | "delivered" | "read" }) {
  if (status === "read") return <span aria-label="Read" title="Read" className="text-accent"><CheckCheck size={12} /></span>;
  if (status === "delivered") return <span aria-label="Delivered" title="Delivered" className="text-primary"><CheckCheck size={12} /></span>;
  return <span aria-label="Sent" title="Sent"><Check size={12} /></span>;
}

function MeshPath({ compact = false }: { compact?: boolean }) {
  return <div className={`flex items-center justify-center ${compact ? "mt-3 h-7 gap-1" : "mt-5 h-12 gap-1.5"}`} aria-label="Simulated mesh relay path"><span className="mesh-node"><span /></span><span className="mesh-link" /><span className="mesh-node mesh-packet"><span /></span><span className="mesh-link" /><span className="mesh-node"><span /></span></div>;
}

function MobileNavigation({ activeView, changeView }: { activeView: View; changeView: (view: View) => void }) {
  const items: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: "chats", label: "Chats", icon: <MessageCircle size={18} /> },
    { id: "nearby", label: "Nearby", icon: <Compass size={18} /> },
    { id: "groups", label: "Groups", icon: <Users size={18} /> },
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];
  return <nav className="mesh-nav grid shrink-0 grid-cols-4 border-t border-sidebar-border px-2 py-1.5 lg:hidden" aria-label="Main navigation">{items.map((item) => <Button key={item.id} variant="ghost" aria-current={activeView === item.id ? "page" : undefined} onClick={() => changeView(item.id)} className={`h-12 flex-col gap-1 rounded-lg p-1 text-[9px] ${activeView === item.id ? "text-sidebar-primary" : "text-sidebar-foreground/60"}`}>{item.icon}<span>{item.label}</span></Button>)}</nav>;
}

function SettingRow({ icon, title, detail, action }: { icon: React.ReactNode; title: string; detail: string; action: React.ReactNode }) {
  return <div className="flex items-center gap-3 py-4"><span className="text-primary">{icon}</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{title}</p><p className="mt-1 text-[10px] text-muted-foreground">{detail}</p></div><span className="shrink-0">{action}</span></div>;
}

function StatStrip({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <div className="flex items-center gap-3 border border-border/70 bg-secondary/20 px-4 py-3"><span className="text-primary">{icon}</span><span className="font-display text-base font-bold">{value}</span><span className="text-[10px] text-muted-foreground">{label}</span></div>;
}

function WelcomeDialog({ nickname, setNickname, close }: { nickname: string; setNickname: (value: string) => void; close: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="welcome-title"><div className="clay-panel relative w-full max-w-md overflow-hidden rounded-2xl p-6 sm:p-8">
    <Button variant="ghost" size="icon" aria-label="Skip welcome" className="absolute right-4 top-4 size-8 rounded-lg text-muted-foreground" onClick={close}><X size={16} /></Button>
    <div className="relative mb-6 flex h-40 items-center justify-center overflow-hidden rounded-xl bg-secondary/55"><div className="radar-ring radar-ring-one" /><div className="radar-ring radar-ring-two" /><div className="radar-ring radar-ring-three" /><div className="radar-core"><Bluetooth size={25} /></div><span className="welcome-node welcome-node-a"><span /></span><span className="welcome-node welcome-node-b"><span /></span><span className="welcome-node welcome-node-c"><span /></span></div>
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">MeshChat · nearby, naturally</p><h2 id="welcome-title" className="mt-2 font-display text-2xl font-extrabold">Chat without internet.</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Keep the conversation going with people close by. Your chats stay on this device.</p>
    <label htmlFor="welcome-name" className="mb-2 mt-5 block text-xs font-semibold">Your nickname</label><Input id="welcome-name" value={nickname} maxLength={24} onChange={(event) => setNickname(event.target.value)} className="h-10 rounded-lg bg-background" />
    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row"><Button variant="outline" className="h-10 flex-1 rounded-lg" onClick={close}>Skip for now</Button><Button className="h-10 flex-1 gap-2 rounded-lg" onClick={close}>Jump to demo <ArrowUpRight size={15} /></Button></div>
  </div></div>;
}

function PacketInspector({ hopLimit, trace, close }: { hopLimit: number; trace: { visitedPeers: string[]; destinationReached: boolean }; close: () => void }) {
  const packet = {
    messageId: "msg_7e91",
    senderId: "prakhar_local",
    receiverId: "maya_local",
    hopCount: Math.min(trace.visitedPeers.length, hopLimit),
    maxHops: hopLimit,
    relayPath: ["Prakhar", ...trace.visitedPeers, ...(trace.destinationReached ? ["Maya"] : [])],
    messageContent: "[encrypted ciphertext · only the recipient can read this]",
    delivery: trace.destinationReached ? "delivered" : "waiting for a route",
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="packet-title"><div className="clay-panel w-full max-w-lg rounded-2xl p-5 sm:p-6">
    <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">LIVE SIMULATION</p><h2 id="packet-title" className="mt-1 font-display text-lg font-bold">Packet inspector</h2><p className="mt-1 text-[11px] text-muted-foreground">Relays can forward a message, but can’t read it.</p></div><Button variant="ghost" size="icon" aria-label="Close packet inspector" className="size-8 rounded-lg text-muted-foreground" onClick={close}><X size={16} /></Button></div>
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-[10px] text-accent"><LockKeyhole size={13} />Message contents hidden from intermediate peers</div>
    <pre className="max-h-72 overflow-auto rounded-lg border border-border/70 bg-background p-4 text-[10px] leading-5 text-muted-foreground"><code>{JSON.stringify(packet, null, 2)}</code></pre>
    <div className="mt-4 flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Zap size={12} className="text-primary" />{packet.relayPath.length} nodes in packet path</span><Button variant="secondary" className="h-8 rounded-lg px-3 text-[10px]" onClick={close}>Done</Button></div>
  </div></div>;
}

function GroupDialog({ value, setValue, close, onSubmit }: { value: string; setValue: (value: string) => void; close: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="group-title"><form onSubmit={onSubmit} className="clay-panel w-full max-w-sm rounded-2xl p-5 sm:p-6">
    <div className="mb-4 flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">LOCAL GROUP</p><h2 id="group-title" className="mt-1 font-display text-lg font-bold">Create a group</h2></div><Button type="button" variant="ghost" size="icon" aria-label="Close group dialog" className="size-8 rounded-lg text-muted-foreground" onClick={close}><X size={16} /></Button></div>
    <label htmlFor="group-name" className="mb-2 block text-xs font-semibold">Group name</label><Input id="group-name" value={value} maxLength={32} placeholder="Weekend plans" onChange={(event) => setValue(event.target.value)} className="h-10 rounded-lg bg-background" />
    <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary/45 p-3 text-[10px] leading-4 text-muted-foreground"><Users size={14} className="shrink-0 text-primary" />Connected peers can receive messages in this local demo.</div>
    <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="ghost" className="h-9 rounded-lg px-3 text-xs" onClick={close}>Cancel</Button><Button type="submit" disabled={!value.trim()} className="h-9 gap-2 rounded-lg px-4 text-xs"><Plus size={14} />Create group</Button></div>
  </form></div>;
}

function getViewKicker(view: View) {
  if (view === "nearby") return "Discover";
  if (view === "groups") return "Your circle";
  if (view === "settings") return "On this device";
  return "Your local network";
}

function getViewTitle(view: View) {
  if (view === "nearby") return "Nearby";
  if (view === "groups") return "Groups";
  if (view === "settings") return "Settings";
  return "Chats";
}