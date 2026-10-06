# frozen_string_literal: true

module AfterPickup
  # The one big "Read next" pick at the end of a post. The post that
  # shares the most tags wins, and a tie goes to the one closest in date.
  # With no shared tags it is the next older post, or the newest post
  # when this one is the oldest. Never the current post, and never a
  # queued one, since _queue/ is not part of site.posts.
  module ReadNext
    module_function

    def pick(site, page)
      return nil unless site && page

      url = page["url"].to_s
      posts = site.posts.docs
      current = posts.find { |post| post.url == url }
      return nil unless current

      others = posts.reject { |post| post.url == url }
      return nil if others.empty?

      best_match(current, others) || next_older(current, posts)
    end

    def best_match(current, others)
      tags = tags_of(current)
      return nil if tags.empty?

      stamp = time_of(current)
      scored = others.filter_map do |post|
        shared = (tags_of(post) & tags).length
        [shared, post] if shared.positive?
      end
      return nil if scored.empty?

      scored.min_by do |shared, post|
        [-shared, (time_of(post) - stamp).abs, -time_of(post)]
      end.last
    end

    def next_older(current, posts)
      newest_first = posts.sort_by { |post| -time_of(post) }
      index = newest_first.index(current)
      older = index ? newest_first[(index + 1)..].to_a.first : nil
      older || newest_first.find { |post| post.url != current.url }
    end

    def tags_of(post)
      Array(post.data["tags"]).map(&:to_s)
    end

    def time_of(post)
      post.date.to_time.to_i
    end
  end
end

module Jekyll
  module RelatedPostsFilter
    # [post] for the Read next card, or [] when there is nothing to show.
    def read_next_posts(page)
      pick = AfterPickup::ReadNext.pick(@context.registers[:site], page)
      pick ? [pick] : []
    end

    # Keep reading: three posts, the ones that share the most tags first,
    # topped up with recent posts so the row stays full. The Read next
    # post is skipped so the same post never shows up twice.
    def related_posts(page, limit = 3)
      site = @context.registers[:site]
      return [] unless site && page

      limit = limit.to_i
      limit = 3 if limit <= 0
      url = page["url"].to_s
      mine = Array(page["tags"]).map(&:to_s)
      skip = AfterPickup::ReadNext.pick(site, page)

      others = site.posts.docs.reject do |post|
        post.url == url || (skip && post.url == skip.url)
      end
      scored = others.map do |post|
        post_tags = Array(post.data["tags"]).map(&:to_s)
        [(post_tags & mine).length, post]
      end

      picked = scored
        .select { |score, _post| score.positive? }
        .sort_by { |score, post| [-score, -post.date.to_time.to_i] }
        .map(&:last)

      if picked.length < limit
        others.sort_by { |post| -post.date.to_time.to_i }.each do |post|
          break if picked.length >= limit

          picked << post unless picked.include?(post)
        end
      end

      picked.first(limit)
    end
  end
end

Liquid::Template.register_filter(Jekyll::RelatedPostsFilter)
