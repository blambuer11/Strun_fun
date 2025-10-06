import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { 
  Search,
  Users2,
  Heart,
  Repeat2,
  MessageCircle,
  Share,
  MoreHorizontal
} from "lucide-react";
import strunLogo from "@/assets/strun-logo.jpg";

const Community = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const posts = [
    {
      id: 1,
      author: "Ava Harper",
      handle: "@avaharper",
      time: "2h",
      content: "Just finished my morning run and claimed a new LandNFT! Feeling energized and ready to conquer the day. #StrunRun #LandNFT",
      image: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&q=80",
      likes: 23,
      reposts: 5,
      comments: 12,
    },
    {
      id: 2,
      author: "Ethan Carter",
      handle: "@ethancarter",
      time: "4h",
      content: "Another day, another LandNFT! Loving the competition and the community support. Let's keep running! #StrunRun #FitnessGoals",
      image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80",
      likes: 45,
      reposts: 10,
      comments: 20,
    },
    {
      id: 3,
      author: "Olivia Bennett",
      handle: "@oliviab",
      time: "6h",
      content: "Exploring new trails and expanding my LandNFT collection. This app is a game-changer for fitness enthusiasts! #StrunRun #LandNFT",
      likes: 31,
      reposts: 7,
      comments: 15,
    },
  ];

  const hashtags = ["#StrunRun", "#LandNFT", "#FitnessGoals"];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card backdrop-blur-lg p-4 sticky top-0 z-50">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img 
                src={strunLogo} 
                alt="Strun Logo" 
                className="h-8 w-auto object-contain"
              />
            </div>
            <Button variant="ghost" size="icon">
              <Search className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search Strun..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-border/50"
            />
          </div>

          {/* Trending Hashtags */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {hashtags.map((tag) => (
              <Button
                key={tag}
                variant="secondary"
                size="sm"
                className="rounded-full text-xs bg-primary/10 hover:bg-primary/20"
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Feed */}
      <div className="container mx-auto px-4 py-4 space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="p-0 bg-card/95 overflow-hidden">
            {/* Post Header */}
            <div className="p-4 flex items-start justify-between">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center text-accent-foreground font-bold">
                  {post.author[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{post.author}</span>
                    <span className="text-sm text-muted-foreground">{post.handle}</span>
                    <span className="text-sm text-muted-foreground">· {post.time}</span>
                  </div>
                  <p className="text-sm mt-1 leading-relaxed">{post.content}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Post Image */}
            {post.image && (
              <div className="w-full">
                <img 
                  src={post.image} 
                  alt="Post content" 
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {/* Post Actions */}
            <div className="p-4 flex items-center justify-between border-t border-border/30">
              <Button variant="ghost" size="sm" className="gap-2 hover:text-accent">
                <Heart className="w-4 h-4" />
                <span className="text-sm">{post.likes}</span>
              </Button>
              <Button variant="ghost" size="sm" className="gap-2 hover:text-accent">
                <Repeat2 className="w-4 h-4" />
                <span className="text-sm">{post.reposts}</span>
              </Button>
              <Button variant="ghost" size="sm" className="gap-2 hover:text-accent">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">{post.comments}</span>
              </Button>
              <Button variant="ghost" size="sm" className="hover:text-accent">
                <Share className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Community;
