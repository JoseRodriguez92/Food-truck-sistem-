import Image from "next/image"
import { Star, MessageSquareQuote } from "lucide-react"
import { getGoogleReviews } from "@/lib/google-places"

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
            i < Math.round(rating) ? "fill-primary text-primary" : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  )
}

export async function GoogleReviewsSection() {
  const data = await getGoogleReviews()

  if (!data || data.reviews.length === 0) return null

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-primary/10 text-primary text-xs sm:text-sm font-medium rounded-full mb-3 sm:mb-4">
            Reseñas
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            LO QUE DICEN <span className="text-primary">DE NOSOTROS</span>
          </h2>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Stars rating={data.rating} />
            <span className="text-sm sm:text-base font-semibold text-foreground">{data.rating.toFixed(1)}</span>
            <span className="text-xs sm:text-sm text-muted-foreground">
              ({data.user_ratings_total} reseñas en Google)
            </span>
          </div>
        </div>

        {/* Reviews row */}
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 scrollbar-brand">
          {data.reviews.map((review) => (
            <div
              key={review.time}
              className="w-[85%] sm:w-80 shrink-0 flex flex-col rounded-2xl border border-border bg-background p-5 sm:p-6 shadow-xs transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-center gap-3 mb-3">
                {review.profile_photo_url ? (
                  <Image
                    src={review.profile_photo_url}
                    alt={review.author_name}
                    width={40}
                    height={40}
                    className="rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                    {review.author_name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{review.author_name}</div>
                  <div className="text-xs text-muted-foreground">{review.relative_time_description}</div>
                </div>
              </div>
              <Stars rating={review.rating} />
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-5">{review.text}</p>
            </div>
          ))}
        </div>

        {/* Google attribution */}
        <div className="mt-8 flex justify-center">
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageSquareQuote className="w-4 h-4" />
            Ver todas las reseñas en Google
          </a>
        </div>
      </div>
    </section>
  )
}
