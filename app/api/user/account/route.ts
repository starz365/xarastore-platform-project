import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function DELETE(request: NextRequest) {
  try {
	const supabase = await createClient();
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token.value);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Verify password before deletion
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Begin transaction
    // 1. Delete user data from all tables (cascading delete should handle this)
    // 2. Delete user files from storage
    // 3. Delete user from auth

    // Delete user files from storage
    const { data: files } = await supabase.storage
      .from('user-content')
      .list(`users/${user.id}`);

    if (files && files.length > 0) {
      await supabase.storage
        .from('user-content')
        .remove(files.map(f => `users/${user.id}/${f.name}`));
    }

    // Delete user's avatar
    const { data: profile } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (profile?.avatar_url) {
      const avatarPath = profile.avatar_url.split('/').pop();
      if (avatarPath) {
        await supabase.storage
          .from('user-content')
          .remove([`avatars/${avatarPath}`]);
      }
    }

    // Delete user data from database
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      console.error('Account deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    // Delete user from auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (authDeleteError) {
      console.error('Auth deletion error:', authDeleteError);
      // Don't return error here as we've already deleted user data
    }

    // Clear auth cookie
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
