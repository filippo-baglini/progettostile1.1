import Skeleton from './Skeleton';

// The profile while the account loads: identity row, tabs, one card
const ProfileSkeleton = () => (
    <div className="min-h-dvh bg-ground" aria-busy="true">
        <div className="h-[60px] border-b border-line" />
        <div className="max-w-[720px] mx-auto px-4 pt-6">
            <div className="flex items-center gap-4">
                <Skeleton variant="circular" className="w-16 h-16" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="w-48 h-7" />
                    <Skeleton className="w-36 h-4" />
                </div>
            </div>
            <Skeleton variant="rectangular" className="w-full h-12 mt-6 !rounded-btn" />
            <div className="ps-card p-6 mt-7 space-y-4">
                <Skeleton className="w-40 h-5" />
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rectangular" className="w-24 h-9" />)}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rectangular" className="w-full aspect-square !rounded-btn" />)}
                </div>
            </div>
        </div>
    </div>
);

export default ProfileSkeleton;
