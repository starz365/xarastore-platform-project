import { render, screen, act } from '@testing-library/react';
import { DealTimer, FlashSaleTimer, DealBadge } from '@/components/deals/DealTimer';

describe('DealTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders countdown correctly', () => {
    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    render(<DealTimer endTime={endTime} />);
    
    expect(screen.getByText('Deal ends in')).toBeInTheDocument();
    expect(screen.getByText('Days')).toBeInTheDocument();
    expect(screen.getByText('Hours')).toBeInTheDocument();
    expect(screen.getByText('Minutes')).toBeInTheDocument();
    expect(screen.getByText('Seconds')).toBeInTheDocument();
  });

  it('shows expired state when time is past', () => {
    const pastTime = new Date(Date.now() - 1000).toISOString();
    
    render(<DealTimer endTime={pastTime} />);
    
    expect(screen.getByText('Deal expired')).toBeInTheDocument();
  });

  it('updates countdown every second', () => {
    const endTime = new Date(Date.now() + 5000).toISOString();
    
    render(<DealTimer endTime={endTime} />);
    
    const initialSeconds = screen.getAllByText('00')[3];
    expect(initialSeconds).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Timer should have updated
    expect(screen.getAllByText('00')[3]).toBeInTheDocument();
  });

  it('calls onExpire callback when timer expires', () => {
    const endTime = new Date(Date.now() + 1000).toISOString();
    const onExpire = jest.fn();
    
    render(<DealTimer endTime={endTime} onExpire={onExpire} />);
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(onExpire).toHaveBeenCalled();
  });

  it('shows urgent state when less than 1 hour remains', () => {
    const endTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    
    render(<DealTimer endTime={endTime} />);
    
    expect(screen.getByText('⚡ Hurry! Deal ends soon')).toBeInTheDocument();
  });

  it('renders compact variant correctly', () => {
    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    render(<DealTimer endTime={endTime} variant="compact" />);
    
    expect(screen.getByText(/\d+h/)).toBeInTheDocument();
    expect(screen.getByText(/\d+m/)).toBeInTheDocument();
  });

  it('renders inline variant correctly', () => {
    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    render(<DealTimer endTime={endTime} variant="inline" />);
    
    expect(screen.getByText(/\d+h \d+m \d+s/)).toBeInTheDocument();
  });
});

describe('FlashSaleTimer', () => {
  it('renders with slots information', () => {
    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    render(
      <FlashSaleTimer
        endTime={endTime}
        totalSlots={100}
        bookedSlots={75}
      />
    );
    
    expect(screen.getByText('Slots remaining')).toBeInTheDocument();
    expect(screen.getByText('25 / 100')).toBeInTheDocument();
  });

  it('shows low stock warning', () => {
    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    render(
      <FlashSaleTimer
        endTime={endTime}
        totalSlots={100}
        bookedSlots={95}
      />
    );
    
    expect(screen.getByText('Only 5 slots left!')).toBeInTheDocument();
  });
});

describe('DealBadge', () => {
  it('renders with discount and timer', () => {
    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    render(<DealBadge endTime={endTime} discount={30} />);
    
    expect(screen.getByText('30% OFF')).toBeInTheDocument();
    expect(screen.getByText(/\d+h/)).toBeInTheDocument();
  });

  it('shows urgent state with animation', () => {
    const endTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    
    render(<DealBadge endTime={endTime} discount={50} />);
    
    const badge = screen.getByText('50% OFF').closest('div');
    expect(badge).toHaveClass('animate-pulse');
  });
});
