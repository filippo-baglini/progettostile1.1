import { useT } from '../../i18n';

const OrDivider = () => {
  const t = useT();
  return (
    <div className="flex items-center gap-3 my-5" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[12.5px] text-muted">{t.common.or}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
};

export default OrDivider;
