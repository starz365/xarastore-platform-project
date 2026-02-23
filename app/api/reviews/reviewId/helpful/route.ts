import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';
import { cookies } from 'next/headers';

const paramsSchema = z.object({
  reviewId: z.string().uuid(),
});

const helpfulSchema = z.object({
  helpful: z.boolean(),
});

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await context.params;
    
    const validation = paramsSchema.safeParse({ reviewId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid review ID', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: { session } } = await supabase.auth.getSession();
    const cookieStore = await cookies();
    const clientId = cookieStore.get('client_id')?.value || 
                     `anon_${Math.random().toString(36).substr(2, 9)}`;

    const body = await request.json();
    
    const helpfulValidation = helpfulSchema.safeParse(body);
    if (!helpfulValidation.success) {
      return NextResponse.json(
        { error: 'Invalid helpful data', details: helpfulValidation.error.errors },
        { status: 400 }
      );
    }

    const { helpful } = helpfulValidation.data;

    // Check if review exists
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if user has already voted
    const userId = session?.user?.id;
    const identifier = userId || clientId;
    const voteType = userId ? 'user' : 'anonymous';

    const { data: existingVote } = await supabase
      .from('review_votes')
      .select('id, helpful')
      .eq('review_id', reviewId)
      .eq(voteType === 'user' ? 'user_id' : 'client_id', identifier)
      .single();

    let result;
    let message;

    if (existingVote) {
      if (existingVote.helpful === helpful) {
        // Remove vote
        await supabase
          .from('review_votes')
          .delete()
          .eq('id', existingVote.id);

        result = { action: 'removed', helpful: null };
        message = 'Vote removed';
      } else {
        // Update vote
        await supabase
          .from('review_votes')
          .update({ helpful, updated_at: new Date().toISOString() })
          .eq('id', existingVote.id);

        result = { action: 'updated', helpful };
        message = `Marked as ${helpful ? 'helpful' : 'not helpful'}`;
      }
    } else {
      // Create new vote
      await supabase
        .from('review_votes')
        .insert({
          review_id: reviewId,
          user_id: userId,
          client_id: !userId ? clientId : null,
          helpful,
          vote_type: voteType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      result = { action: 'added', helpful };
      message = `Marked as ${helpful ? 'helpful' : 'not helpful'}`;
    }

    // Get updated vote counts
    const { data: helpfulVotes } = await supabase
      .from('review_votes')
      .select('id', { count: 'exact', head: true })
      .eq('review_id', reviewId)
      .eq('helpful', true);

    const { data: totalVotes } = await supabase
      .from('review_votes')
      .select('id', { count: 'exact', head: true })
      .eq('review_id', reviewId);

    const responseData = {
      success: true,
      data: {
        reviewId,
        ...result,
        counts: {
          helpful: helpfulVotes?.count || 0,
          total: totalVotes?.count || 0,
          percentage: totalVotes?.count 
            ? Math.round(((helpfulVotes?.count || 0) / totalVotes.count) * 100)
            : 0,
        },
        userVote: result.helpful,
      },
      message,
    };

    const response = NextResponse.json(responseData);

    // Set client ID cookie for anonymous users
    if (!session?.user && !cookieStore.get('client_id')) {
      response.cookies.set({
        name: 'client_id',
        value: clientId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    console.error('Helpful vote error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process vote',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await context.params;
    
    const validation = paramsSchema.safeParse({ reviewId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid review ID', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: { session } } = await supabase.auth.getSession();
    const cookieStore = await cookies();
    const clientId = cookieStore.get('client_id')?.value;

    // Get vote counts
    const { data: helpfulVotes } = await supabase
      .from('review_votes')
      .select('id', { count: 'exact', head: true })
      .eq('review_id', reviewId)
      .eq('helpful', true);

    const { data: totalVotes } = await supabase
      .from('review_votes')
      .select('id', { count: 'exact', head: true })
      .eq('review_id', reviewId);

    // Get user's vote if exists
    let userVote = null;
    if (session?.user) {
      const { data: userVoteData } = await supabase
        .from('review_votes')
        .select('helpful')
        .eq('review_id', reviewId)
        .eq('user_id', session.user.id)
        .single();
      
      userVote = userVoteData?.helpful;
    } else if (clientId) {
      const { data: anonVoteData } = await supabase
        .from('review_votes')
        .select('helpful')
        .eq('review_id', reviewId)
        .eq('client_id', clientId)
        .single();
      
      userVote = anonVoteData?.helpful;
    }

    const response = {
      success: true,
      data: {
        reviewId,
        counts: {
          helpful: helpfulVotes?.count || 0,
          total: totalVotes?.count || 0,
          percentage: totalVotes?.count 
            ? Math.round(((helpfulVotes?.count || 0) / totalVotes.count) * 100)
            : 0,
        },
        userVote,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=1800',
      },
    });
  } catch (error: any) {
    console.error('Get helpful votes error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch vote data',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
