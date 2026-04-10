import '../styles/Auth.css';

const LoadingButton = ({
  loading = false,
  children,
  loadingText = 'Chargement...',
  className = '',
  ...props
}) => {
  return (
    <button
      className={`loading-btn ${loading ? 'loading-btn--loading' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <span className="loading-btn__spinner" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;
