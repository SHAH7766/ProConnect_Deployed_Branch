export const Skeleton = ({ width, height, borderRadius = '8px', className = '' }) => (
  <div
    className={`skeleton ${className}`}
    style={{
      width: width || '100%',
      height: height || '20px',
      borderRadius,
    }}
  />
);

export const ProviderCardSkeleton = () => (
  <div className="provider-card border-0 shadow-sm p-4 text-center">
    <Skeleton width="72px" height="72px" borderRadius="22px" className="mx-auto mb-3" />
    <Skeleton width="60%" height="20px" className="mx-auto mb-2" />
    <Skeleton width="40%" height="16px" className="mx-auto mb-3" />
    <Skeleton height="14px" className="mb-2" />
    <Skeleton width="80%" height="14px" className="mb-2" />
    <Skeleton width="70%" height="14px" />
  </div>
);

export const BookingCardSkeleton = () => (
  <div className="booking-mobile-card">
    <div className="d-flex align-items-center gap-3 mb-3">
      <Skeleton width="44px" height="44px" borderRadius="8px" />
      <div className="flex-grow-1">
        <Skeleton width="70%" height="16px" className="mb-2" />
        <Skeleton width="50%" height="13px" />
      </div>
      <Skeleton width="60px" height="24px" borderRadius="999px" />
    </div>
    <Skeleton height="14px" className="mb-2" />
    <Skeleton width="80%" height="14px" />
  </div>
);

export const ProfileSkeleton = () => (
  <div className="glass-card">
    <div className="d-flex align-items-center gap-3 mb-4">
      <Skeleton width="80px" height="80px" borderRadius="50%" />
      <div>
        <Skeleton width="180px" height="24px" className="mb-2" />
        <Skeleton width="120px" height="16px" />
      </div>
    </div>
    <Skeleton height="16px" className="mb-2" />
    <Skeleton width="90%" height="16px" className="mb-2" />
    <Skeleton width="75%" height="16px" />
  </div>
);
