# frozen_string_literal: true

require "open3"
require "pathname"
require "time"
require "tzinfo"

module AfterPickup
  # Sitemap lastmod and article dateModified come from git, not the
  # build clock. A page with no source file, such as a topic page,
  # uses the newest post it lists.
  class LastModified < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      zone = TZInfo::Timezone.get(site.config["timezone"] || "America/Los_Angeles")

      site.posts.docs.each do |post|
        post.data["last_modified_at"] = later_than_publish(post.date, committed_at(site, post), zone)
      end

      site.pages.each do |page|
        next if page.data["sitemap"] == false

        stamp = committed_at(site, page)
        page.data["last_modified_at"] = in_zone(stamp, zone) if stamp
      end

      site.pages.each do |page|
        next if page.data["sitemap"] == false

        extra = nil
        if page.url == "/"
          extra = newest(site.posts.docs)
        elsif page.data["topic_id"]
          extra = newest_in_topic(site, page.data["topic_tags"])
        end
        next unless extra

        page.data["last_modified_at"] = [page.data["last_modified_at"], extra].compact.max
      end
    end

    def newest(posts)
      posts.filter_map { |post| post.data["last_modified_at"] }.max
    end

    def newest_in_topic(site, tags)
      wanted = Array(tags).map(&:to_s)
      newest(site.posts.docs.select do |post|
        post_tags = Array(post.data["tags"]).map(&:to_s)
        (post_tags & wanted).any?
      end)
    end

    # dateModified should not sit before the publish date.
    def later_than_publish(published, stamp, zone)
      modified = in_zone(stamp, zone) if stamp
      return published unless modified
      return published if published && modified.to_time < published.to_time

      modified
    end

    def in_zone(time, zone)
      return nil unless time

      zone.to_local(time.utc)
    end

    def committed_at(site, item)
      full = source_file(site, item)
      return nil unless full

      committed_at_path(site, full)
    end

    def committed_at_path(site, full)
      root = File.expand_path(site.source)
      relative = Pathname.new(File.expand_path(full)).relative_path_from(Pathname.new(root)).to_s
      stdout, status = Open3.capture2(
        "git", "-C", root, "log", "-1", "--format=%cI", "--", relative
      )
      if status.success?
        stamp = stdout.to_s.strip
        return Time.parse(stamp) unless stamp.empty?
      end

      File.mtime(full)
    rescue StandardError
      File.mtime(full)
    end

    def source_file(site, item)
      candidates = []
      candidates << item.path.to_s if item.respond_to?(:path)
      candidates << item.relative_path.to_s if item.respond_to?(:relative_path)
      candidates.each do |raw|
        next if raw.nil? || raw.empty?

        return raw if raw.start_with?("/") && File.file?(raw)

        candidate = File.expand_path(raw, site.source)
        return candidate if File.file?(candidate)
      end
      nil
    end
  end
end
