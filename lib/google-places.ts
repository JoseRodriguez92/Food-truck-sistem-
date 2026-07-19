export interface GoogleReview {
  author_name: string
  author_url?: string
  profile_photo_url?: string
  rating: number
  relative_time_description: string
  text: string
  time: number
}

export interface GooglePlaceReviews {
  name: string
  rating: number
  user_ratings_total: number
  url: string
  reviews: GoogleReview[]
}

export async function getGoogleReviews(): Promise<GooglePlaceReviews | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const placeId = process.env.GOOGLE_PLACE_ID

  if (!apiKey || !placeId) return null

  try {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'name,rating,user_ratings_total,reviews,url',
      language: 'es',
      key: apiKey,
    })

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
      { next: { revalidate: 86400 } }
    )
    const data = await res.json()

    if (data.status !== 'OK' || !data.result) return null

    return {
      name: data.result.name,
      rating: data.result.rating ?? 0,
      user_ratings_total: data.result.user_ratings_total ?? 0,
      url: data.result.url,
      reviews: (data.result.reviews ?? []) as GoogleReview[],
    }
  } catch {
    return null
  }
}
