import { motion } from 'framer-motion';

const MotionButton = ({ children, className = '', onClick, disabled, variant = 'primary', type = 'button', ...props }) => (
  <motion.button
    type={type}
    className={`btn btn-${variant} ${className}`}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.96 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    onClick={onClick}
    disabled={disabled}
    {...props}
  >
    {children}
  </motion.button>
);

export default MotionButton;
