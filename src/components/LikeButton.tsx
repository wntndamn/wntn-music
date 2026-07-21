import { useNavigate } from "react-router-dom";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";

export default function LikeButton({
  trackId,
  size = 18,
}: {
  trackId: string;
  size?: number;
}) {
  const { user, likes, toggleLike } = useAuth();
  const navigate = useNavigate();
  const liked = likes.has(trackId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return navigate("/login");
        void toggleLike(trackId).catch(() => {});
      }}
      aria-label={liked ? "убрать лайк" : "лайк"}
      className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text data-[liked=true]:text-accent"
      data-liked={liked}
    >
      {liked ? <IconHeartFilled size={size} /> : <IconHeart size={size} />}
    </button>
  );
}
