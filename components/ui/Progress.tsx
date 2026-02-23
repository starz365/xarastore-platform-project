import { cn } from '@/lib/utils/css';

interface ProgressProps {
  value: number;
  max?: number;
  showValue?: boolean;
  valuePosition?: 'inside' | 'outside';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  striped?: boolean;
  animated?: boolean;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
  valueClassName?: string;
}

const sizeClasses = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

const variantClasses = {
  default: 'bg-red-600',
  success: 'bg-green-600',
  warning: 'bg-yellow-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
};

export function Progress({
  value,
  max = 100,
  showValue = false,
  valuePosition = 'outside',
  size = 'md',
  variant = 'default',
  striped = false,
  animated = false,
  className,
  trackClassName,
  indicatorClassName,
  valueClassName,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const formattedValue = `${Math.round(percentage)}%`;

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('flex items-center', valuePosition === 'outside' && 'space-x-3')}>
        {valuePosition === 'outside' && showValue && (
          <span className={cn('text-sm font-medium text-gray-700 min-w-[40px]', valueClassName)}>
            {formattedValue}
          </span>
        )}
        
        <div className="flex-1">
          <div
            className={cn(
              'w-full bg-gray-200 rounded-full overflow-hidden',
              sizeClasses[size],
              trackClassName
            )}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={`Progress: ${formattedValue}`}
          >
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                variantClasses[variant],
                striped && 'bg-stripes',
                animated && 'animate-pulse',
                indicatorClassName
              )}
              style={{ width: `${percentage}%` }}
            >
              {valuePosition === 'inside' && showValue && (
                <div className="flex items-center justify-center h-full">
                  <span className="text-xs font-medium text-white px-2 truncate">
                    {formattedValue}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Progress with steps
interface StepProgressProps {
  steps: string[];
  currentStep: number;
  completedStep?: number;
  className?: string;
  stepClassName?: string;
  activeStepClassName?: string;
  completedStepClassName?: string;
  lineClassName?: string;
  showLabels?: boolean;
}

export function StepProgress({
  steps,
  currentStep,
  completedStep,
  className,
  stepClassName,
  activeStepClassName = 'bg-red-600 text-white',
  completedStepClassName = 'bg-green-600 text-white',
  lineClassName = 'bg-gray-300',
  showLabels = true,
}: StepProgressProps) {
  const effectiveCompletedStep = completedStep !== undefined ? completedStep : currentStep - 1;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index <= effectiveCompletedStep;
          const isActive = index === currentStep;
          const isFuture = index > currentStep;

          return (
            <div key={step} className="flex items-center flex-1">
              {/* Step */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm',
                    'border-2 transition-colors',
                    isCompleted && completedStepClassName,
                    isActive && activeStepClassName,
                    isFuture && 'bg-white border-gray-300 text-gray-400',
                    stepClassName
                  )}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                
                {showLabels && (
                  <span className={cn(
                    'mt-2 text-xs font-medium text-center',
                    isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'
                  )}>
                    {step}
                  </span>
                )}
              </div>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 relative">
                  <div
                    className={cn(
                      'absolute inset-0',
                      lineClassName
                    )}
                  />
                  <div
                    className={cn(
                      'absolute inset-0 bg-red-600 transition-all duration-300',
                      index < effectiveCompletedStep ? 'w-full' : 'w-0'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Progress with label
interface LabeledProgressProps extends ProgressProps {
  label: string;
  description?: string;
  labelPosition?: 'top' | 'left';
}

export function LabeledProgress({
  label,
  description,
  labelPosition = 'top',
  ...progressProps
}: LabeledProgressProps) {
  return (
    <div className={cn(
      labelPosition === 'left' && 'flex items-center space-x-4'
    )}>
      <div className={cn(
        labelPosition === 'top' && 'mb-2',
        labelPosition === 'left' && 'min-w-[120px]'
      )}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {progressProps.showValue && progressProps.valuePosition === 'outside' && (
            <span className="text-sm font-medium text-gray-700">
              {Math.round((progressProps.value / (progressProps.max || 100)) * 100)}%
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <div className={cn('flex-1', labelPosition === 'left' && 'min-w-0')}>
        <Progress {...progressProps} showValue={false} />
      </div>
    </div>
  );
}

// Compound components
Progress.Steps = StepProgress;
Progress.Labeled = LabeledProgress;
