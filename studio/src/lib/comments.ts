import { supabase } from "./supabaseClient";

export async function getComments(productId: string) {
  // Get approved reviews
  const { data: reviews, error: reviewError } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (reviewError) throw reviewError;

  if (!reviews || reviews.length === 0) return [];

  // Get replies
  const reviewIds = reviews.map(r => r.id);

  const { data: replies, error: replyError } = await supabase
    .from("review_replies")
    .select("*")
    .in("review_id", reviewIds)
    .order("created_at", { ascending: true });

  if (replyError) throw replyError;

  return reviews.map(review => ({
    ...review,
    replies: (replies || []).filter(r => r.review_id === review.id)
  }));
}

export async function submitComment({
  product_id,
  author,
  rating,
  comment,
  tag
}: {
  product_id: string;
  author: string;
  rating: number;
  comment: string;
  tag: string;
}) {
  const { data, error } = await supabase
    .from("product_reviews")
    .insert([
      {
        product_id,
        author,
        rating,
        comment,
        tag,
        status: "pending"
      }
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function voteHelpful(id: string, currentVotes: number) {
  const { error } = await supabase
    .from("product_reviews")
    .update({
      helpful_votes: currentVotes + 1
    })
    .eq("id", id);

  if (error) throw error;
}

export async function submitReply({
  review_id,
  author,
  text,
  is_admin
}: {
  review_id: string;
  author: string;
  text: string;
  is_admin: boolean;
}) {
  const { data, error } = await supabase
    .from("review_replies")
    .insert([
      {
        review_id,
        author,
        text,
        is_admin
      }
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
}