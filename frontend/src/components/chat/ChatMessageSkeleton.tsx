import Skeleton from '../ui/Skeleton';

// While an old chat loads: a user line, then the stylist's text and a ticket-shaped block
const ChatMessageSkeleton = () => (
  <div className="space-y-8" aria-busy="true">
    <div className="flex justify-end">
      <Skeleton variant="rectangular" className="h-11 w-[260px] max-w-[80%] !rounded-[18px]" />
    </div>
    <div className="space-y-3">
      <Skeleton className="w-20 h-3" />
      <Skeleton className="w-full max-w-[520px]" />
      <Skeleton className="w-3/5 max-w-[380px]" />
      <div className="ps-card p-5 mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton variant="rectangular" className="w-full aspect-[4/5] !rounded-btn" />
              <Skeleton className="w-4/5 h-3" />
              <Skeleton className="w-1/2 h-4" />
            </div>
          ))}
        </div>
        <Skeleton className="w-40 h-9 mt-6" />
      </div>
    </div>
  </div>
);

export default ChatMessageSkeleton;
