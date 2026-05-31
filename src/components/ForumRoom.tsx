import { useState, FormEvent } from "react";
import { ForumPost, ForumComment } from "../types";
import { 
  MessageSquare,   
  ThumbsUp, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  X, 
  Plus, 
  Search, 
  Download, 
  ExternalLink,
  Bot,
  User,
  Info
} from "lucide-react";

interface ForumRoomProps {
  posts: ForumPost[];
  onAddPost: (title: string, content: string, subject: string) => void;
  onAddComment: (postId: string, content: string, isActionResolved?: boolean) => void;
  onAIResolvePost: (postId: string) => Promise<void>;
}

export default function ForumRoom({ posts, onAddPost, onAddComment, onAIResolvePost }: ForumRoomProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  
  // Create Post States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [postTitle, setPostTitle] = useState<string>("");
  const [postContent, setPostContent] = useState<string>("");
  const [postSubject, setPostSubject] = useState<string>("Operating Systems");

  // Create Comment State
  const [commentText, setCommentText] = useState<string>("");
  const [isAIResolving, setIsAIResolving] = useState<{ [postId: string]: boolean }>({});

  const handleCreatePostSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;
    
    onAddPost(postTitle, postContent, postSubject);
    setPostTitle("");
    setPostContent("");
    setShowCreateModal(false);
  };

  const handleCommentSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedPost) return;

    onAddComment(selectedPost.id, commentText);
    
    // Also synchronously update active selected post state to show new comment immediately
    const tempComment: ForumComment = {
      id: "c_temp_" + Date.now(),
      authorName: "You (Aspirant)",
      authorRole: "Student",
      avatarColor: "#2563EB",
      content: commentText,
      createdAt: new Date().toISOString(),
      likes: 0
    };

    setSelectedPost(prev => prev ? {
      ...prev,
      commentsCount: prev.commentsCount + 1,
      comments: [...prev.comments, tempComment]
    } : null);

    setCommentText("");
  };

  const triggerAIResolution = async (postId: string) => {
    setIsAIResolving(prev => ({ ...prev, [postId]: true }));
    try {
      await onAIResolvePost(postId);
      
      // Update selected post state to include newly appended AI Comment
      const matchingPost = posts.find(p => p.id === postId);
      if (matchingPost) {
        setSelectedPost(matchingPost);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAIResolving(prev => ({ ...prev, [postId]: false }));
    }
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Lobby View */}
      {!selectedPost ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900">GATE 2027 Doubt & Discussion Desk</h2>
              <p className="text-sm text-slate-500">Collaborate on complex calculations, resolve questions, and get expert responses.</p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 self-start"
            >
              <Plus className="w-4 h-4" /> Raise a Doubt
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4.5 h-4.5 text-slate-400 absolute left-4 top-3.5" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search equations, topics or subject tags (e.g., Natural Join, Dijkstra, Paging...)"
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>

          {/* Posts Grid List */}
          <div className="space-y-4">
            {filteredPosts.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" strokeWidth={1.5} />
                <h4 className="font-display font-semibold text-slate-700 text-base">No doubt threads match your search query.</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Try typing another core concept or click 'Raise a Doubt' to start an active thread.</p>
              </div>
            ) : (
              filteredPosts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => setSelectedPost(post)}
                  className="bg-white border-2 border-slate-100 hover:border-indigo-300 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4 transition cursor-pointer select-none"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <span className="bg-slate-100 text-slate-800 text-[10px] tracking-wider uppercase font-mono font-semibold px-2.5 py-1 rounded">
                        {post.subject}
                      </span>
                      {post.isResolved ? (
                        <span className="bg-green-50 text-green-700 border border-green-100 text-[10px] tracking-wide uppercase font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] tracking-wide uppercase font-mono font-bold px-2 py-0.5 rounded">
                          Unresolved
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-display font-semibold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                      {post.title}
                    </h3>

                    <p className="text-slate-600 text-sm line-clamp-2">
                      {post.content}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: post.avatarColor }} />
                      <span className="text-slate-700 font-semibold font-sans">{post.authorName}</span>
                      <span className="text-slate-400 text-[10px]">({post.authorRole})</span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span>Likes: <strong>{post.likes}</strong></span>
                      <span>Replies: <strong>{post.commentsCount}</strong></span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Detailed Thread View */
        <div className="space-y-6 animate-fade-in text-sans">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setSelectedPost(null)}
              className="text-slate-500 hover:text-slate-800 text-xs font-semibold hover:underline"
            >
              ← Back to doubt listings
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            {/* Opener Post */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2.5 items-center justify-between">
                <span className="bg-slate-100 text-slate-800 text-xs tracking-wider uppercase font-mono px-2.5 py-1 rounded">
                  {selectedPost.subject}
                </span>

                <div className="flex items-center gap-2">
                  <a 
                    href="/api/download/prep-package?format=html"
                    target="_blank"
                    className="border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer font-semibold"
                    title="Export Thread Offline"
                  >
                    <Download className="w-3.5 h-3.5" /> Save offline
                  </a>
                  {!selectedPost.isResolved && (
                    <button
                      disabled={isAIResolving[selectedPost.id]}
                      onClick={() => triggerAIResolution(selectedPost.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 shadow-sm transition font-semibold"
                    >
                      {isAIResolving[selectedPost.id] ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Resolving is active...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> Ask Shiva to Resolve
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-display font-bold text-slate-900 leading-snug">{selectedPost.title}</h3>
              
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap select-text">
                {selectedPost.content}
              </p>

              <div className="pt-3 flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-700">{selectedPost.authorName}</span>
                  <span>({selectedPost.authorRole})</span>
                  <span>• Posted on {new Date(selectedPost.createdAt).toLocaleDateString()}</span>
                </div>
                <span>Views: {selectedPost.views}</span>
              </div>
            </div>

            {/* Comments Lists */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h4 className="font-display font-semibold text-slate-800 text-sm">Comments & Expert Resolutions ({selectedPost.comments.length})</h4>
              
              {selectedPost.comments.length === 0 ? (
                <p className="text-slate-400 text-xs italic">No comments posted yet. Be the first to answer this peer query, or trigger the AI Mentor!</p>
              ) : (
                <div className="space-y-4">
                  {selectedPost.comments.map(comment => {
                    const isAi = comment.authorRole === "AI-Mentor";
                    const bgStyle = isAi 
                      ? "bg-blue-50/50 border border-blue-200" 
                      : comment.isCorrectSolution 
                      ? "bg-emerald-50/50 border border-emerald-200" 
                      : "bg-slate-50 border border-slate-100";

                    return (
                      <div key={comment.id} className={`rounded-xl p-4 space-y-2.5 ${bgStyle}`}>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-700 font-sans">{comment.authorName}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${isAi ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                              {comment.authorRole}
                            </span>
                          </div>
                          <span className="text-slate-400">{new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>

                        <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap select-text">
                          {comment.content}
                        </p>

                        <div className="flex sm:items-center justify-between pt-1 text-[10px] font-mono text-slate-400">
                          <span>Verified Solution Keys</span>
                          <button className="flex items-center gap-1 text-slate-500 hover:text-slate-800">
                            <ThumbsUp className="w-3 h-3" /> Likes ({comment.likes})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Answer Post Form */}
            <form onSubmit={handleCommentSubmit} className="pt-6 border-t border-slate-100 space-y-3">
              <label className="text-xs font-medium text-slate-500 block">Post Your Explanation</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your calculation step/formulas with the student..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 outline-none"
                  required
                />
                <button 
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1 transition shrink-0"
                >
                  <Send className="w-4 h-4" /> Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doubts Creator Modal Dialog panel */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreatePostSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 max-w-xl w-full space-y-6 shadow-2xl animate-fade-in text-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display font-semibold text-slate-900 text-lg">Raise a Fresh Subject Doubt</h3>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div className="space-y-1.5">
                <label className="text-slate-500 font-mono">Doubt Subject</label>
                <select
                  value={postSubject}
                  onChange={(e) => setPostSubject(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:border-blue-500 outline-none text-xs"
                >
                  <option value="Databases (DBMS)">Database Systems & SQL</option>
                  <option value="Operating Systems">Operating Systems</option>
                  <option value="Computer Networks">Computer Networks</option>
                  <option value="Algorithms & Programming">Algorithms & Data Structures</option>
                  <option value="Engineering Mathematics & Discrete Maths">Engineering Mathematics & Discrete Maths</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500">Doubt Title Summary</label>
                <input 
                  type="text" 
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Dijkstra cycle count check for negative vertices"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500">Full Question details / Tracing code</label>
                <textarea 
                  rows={4}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Insert calculation values, problem statements or code segments clearly..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:border-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 text-xs">
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:underline font-semibold px-4 py-2"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition"
              >
                Submit Doubt
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
