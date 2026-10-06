# frozen_string_literal: true

module AfterPickup
  # One indexable landing page per entry in _data/topics.yml.
  # Posts are collected from tags, so a new post appears on its own.
  class TopicPages < Jekyll::Generator
    safe true
    priority :high

    def generate(site)
      Array(site.data["topics"]).each do |topic|
        next unless topic.is_a?(Hash) && topic["id"]

        tags = Array(topic["tags"]).map(&:to_s)
        posts = posts_for(site, tags)
        page = Jekyll::PageWithoutAFile.new(site, site.source, "topics/#{topic['id']}", "index.html")
        page.data["layout"] = "topic"
        page.data["title"] = topic["title"].to_s
        page.data["description"] = topic["description"].to_s
        page.data["intro"] = topic["intro"].to_s
        page.data["topic_id"] = topic["id"].to_s
        page.data["topic_tags"] = tags
        page.data["topic_posts"] = posts
        page.data["permalink"] = "/topics/#{topic['id']}/"
        lead = posts.first
        if lead && lead.data["image"]
          page.data["image"] = lead.data["image"]
          page.data["image_alt"] = lead.data["image_alt"] || lead.data["title"]
        end
        site.pages << page
      end
    end

    def posts_for(site, tags)
      site.posts.docs
        .select do |post|
          post_tags = Array(post.data["tags"]).map(&:to_s)
          (post_tags & tags).any?
        end
        .sort_by { |post| post.date.to_time }
        .reverse
    end
  end
end
