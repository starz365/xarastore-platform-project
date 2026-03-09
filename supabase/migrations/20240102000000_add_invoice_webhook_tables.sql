-- Webhook deliveries tracking
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload JSONB,
    response_status INTEGER,
    response_body TEXT,
    success BOOLEAN DEFAULT FALSE,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook_id ON public.webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created_at ON public.webhook_deliveries(created_at);

-- Invoice items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- Invoice downloads tracking
CREATE TABLE IF NOT EXISTS public.invoice_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET
);

CREATE INDEX idx_invoice_downloads_invoice_id ON public.invoice_downloads(invoice_id);
CREATE INDEX idx_invoice_downloads_user_id ON public.invoice_downloads(user_id);

-- Add columns to existing invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS tax DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES',
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS billing_address JSONB,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Add columns to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Nairobi';

-- RLS Policies
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_downloads ENABLE ROW LEVEL SECURITY;

-- Webhook deliveries policies
CREATE POLICY "Users can view own webhook deliveries"
    ON public.webhook_deliveries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.webhooks
            WHERE webhooks.id = webhook_deliveries.webhook_id
            AND webhooks.user_id = auth.uid()
        )
    );

-- Invoice items policies
CREATE POLICY "Users can view own invoice items"
    ON public.invoice_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = auth.uid()
        )
    );

-- Invoice downloads policies
CREATE POLICY "Users can view own invoice downloads"
    ON public.invoice_downloads FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can insert invoice downloads"
    ON public.invoice_downloads FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    month TEXT;
    sequence INTEGER;
    invoice_number TEXT;
BEGIN
    year := TO_CHAR(CURRENT_DATE, 'YYYY');
    month := TO_CHAR(CURRENT_DATE, 'MM');
    
    SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM 'INV-\d{4}-\d{2}-(\d+)')::INTEGER), 0) + 1
    INTO sequence
    FROM public.invoices
    WHERE invoice_number LIKE 'INV-' || year || '-' || month || '-%';
    
    invoice_number := 'INV-' || year || '-' || month || '-' || LPAD(sequence::TEXT, 4, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice number
CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := public.generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number_trigger
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.set_invoice_number();

-- Function to calculate invoice totals
CREATE OR REPLACE FUNCTION public.calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total := NEW.subtotal + COALESCE(NEW.tax, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_invoice_totals_trigger
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_invoice_totals();

-- Function to log webhook delivery
CREATE OR REPLACE FUNCTION public.log_webhook_delivery(
    p_webhook_id UUID,
    p_event TEXT,
    p_payload JSONB,
    p_response_status INTEGER,
    p_response_body TEXT,
    p_success BOOLEAN,
    p_duration_ms INTEGER
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.webhook_deliveries (
        webhook_id,
        event,
        payload,
        response_status,
        response_body,
        success,
        duration_ms,
        created_at
    ) VALUES (
        p_webhook_id,
        p_event,
        p_payload,
        p_response_status,
        p_response_body,
        p_success,
        p_duration_ms,
        NOW()
    );
    
    -- Update webhook last triggered
    UPDATE public.webhooks
    SET last_triggered_at = NOW()
    WHERE id = p_webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
